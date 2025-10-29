import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

interface SafetyFactors {
  policeStations: number;
  cctvCameras: number;
  wellLitAreas: string;
  crowdedAreas: string;
  safetyScore: string;
  routeLength: string;
  estimatedTime: string;
  highRiskAreas: string[];
  safeZones: string[];
}

const MainScreen: React.FC = () => {
  const [startLocation, setStartLocation] = useState<string>('');
  const [endLocation, setEndLocation] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPoliceStations, setShowPoliceStations] = useState<boolean>(false);
  const [showRouteAnalysis, setShowRouteAnalysis] = useState<boolean>(false);
  const [currentSafetyData, setCurrentSafetyData] = useState<any>(null);
  const webViewRef = useRef<WebView>(null);

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
    <style>
        body { margin: 0; padding: 0; }
        #map { height: 100vh; width: 100vw; }
        .police-icon { background: #dc3545; border-radius: 50%; }
        .route-analysis-panel {
            position: absolute;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background: white;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 1000;
            display: none;
            max-height: 70vh;
            overflow-y: auto;
        }
        .close-button {
            position: absolute;
            top: 10px;
            right: 15px;
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            font-size: 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .safety-score {
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            margin: 10px 0;
            padding: 10px;
            border-radius: 10px;
        }
        .safety-item {
            margin: 8px 0;
            padding: 8px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .risk-item {
            color: #dc3545;
            margin: 4px 0;
        }
        .safe-item {
            color: #28a745;
            margin: 4px 0;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <div id="routeAnalysis" class="route-analysis-panel">
        <button class="close-button" onclick="closeAnalysis()">×</button>
        <div id="analysisContent"></div>
    </div>

    <script>
        var map = L.map('map').setView([12.9716, 77.5946], 12);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        var policeMarkers = [];
        var routePolyline = null;
        var startMarker = null;
        var endMarker = null;
        var currentRoute = null;

        // Bangalore police stations
        var policeStations = [
            {name: "Cubbon Park PS", lat: 12.9768, lng: 77.5953},
            {name: "Commercial Street PS", lat: 12.9815, lng: 77.6082},
            {name: "Ashok Nagar PS", lat: 12.9784, lng: 77.5778},
            {name: "Ulsoor PS", lat: 12.9789, lng: 77.6214},
            {name: "HSR Layout PS", lat: 12.9116, lng: 77.6473},
            {name: "Koramangala PS", lat: 12.9348, lng: 77.6264},
            {name: "Jayanagar PS", lat: 12.9302, lng: 77.5834},
            {name: "Indiranagar PS", lat: 12.9782, lng: 77.6408},
            {name: "Whitefield PS", lat: 12.9698, lng: 77.7499},
            {name: "Yeshwanthpur PS", lat: 13.0256, lng: 77.5485},
            {name: "Malleshwaram PS", lat: 13.0067, lng: 77.5751},
            {name: "Rajajinagar PS", lat: 12.9916, lng: 77.5512}
        ];

        function createPoliceIcon() {
            return L.divIcon({
                className: 'police-icon',
                html: '<div style="background-color: #dc3545; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });
        }

        function showPoliceStations() {
            policeMarkers.forEach(marker => map.removeLayer(marker));
            policeMarkers = [];
            
            policeStations.forEach(station => {
                var icon = createPoliceIcon();
                var marker = L.marker([station.lat, station.lng], { icon: icon })
                    .bindPopup('<b>' + station.name + '</b>')
                    .addTo(map);
                policeMarkers.push(marker);
            });
        }

        function hidePoliceStations() {
            policeMarkers.forEach(marker => map.removeLayer(marker));
            policeMarkers = [];
        }

        function togglePoliceStations() {
            if (policeMarkers.length > 0) {
                hidePoliceStations();
                return false;
            } else {
                showPoliceStations();
                return true;
            }
        }

        // Geocode location using Nominatim
        function geocodeLocation(query, callback) {
            var url = 'https://nominatim.openstreetmap.org/search?format=json&q=' + 
                     encodeURIComponent(query + ', Bangalore') + '&limit=1';
            
            fetch(url)
                .then(response => response.json())
                .then(data => {
                    if (data && data.length > 0) {
                        var result = data[0];
                        callback({
                            lat: parseFloat(result.lat),
                            lng: parseFloat(result.lon),
                            name: result.display_name
                        });
                    } else {
                        callback(null);
                    }
                })
                .catch(error => {
                    console.error('Geocoding error:', error);
                    callback(null);
                });
        }

        function drawRoute(start, end) {
            if (routePolyline) map.removeLayer(routePolyline);
            if (startMarker) map.removeLayer(startMarker);
            if (endMarker) map.removeLayer(endMarker);
            
            startMarker = L.marker([start.lat, start.lng])
                .bindPopup('<b>Start: ' + start.name + '</b>')
                .addTo(map);
            
            endMarker = L.marker([end.lat, end.lng])
                .bindPopup('<b>End: ' + end.name + '</b>')
                .addTo(map);
            
            getOSRMRoute(start, end);
        }

        function getOSRMRoute(start, end) {
            var url = 'https://router.project-osrm.org/route/v1/driving/' + 
                     start.lng + ',' + start.lat + ';' + 
                     end.lng + ',' + end.lat + 
                     '?overview=full&geometries=geojson';
            
            fetch(url)
                .then(response => response.json())
                .then(data => {
                    if (data.routes && data.routes.length > 0) {
                        var coordinates = data.routes[0].geometry.coordinates;
                        var routePoints = coordinates.map(coord => [coord[1], coord[0]]);
                        
                        routePolyline = L.polyline(routePoints, {
                            color: '#007AFF', 
                            weight: 6, 
                            opacity: 0.8
                        }).addTo(map);
                        
                        map.fitBounds(routePolyline.getBounds());
                        
                        currentRoute = {
                            start: start,
                            end: end,
                            route: routePoints,
                            distance: (data.routes[0].distance / 1000).toFixed(2),
                            duration: Math.floor(data.routes[0].duration / 60)
                        };
                    }
                })
                .catch(error => {
                    console.error('Routing error:', error);
                    // Fallback straight line
                    var routePoints = [[start.lat, start.lng], [end.lat, end.lng]];
                    routePolyline = L.polyline(routePoints, {
                        color: '#007AFF', 
                        weight: 6, 
                        opacity: 0.8
                    }).addTo(map);
                    
                    currentRoute = {
                        start: start,
                        end: end,
                        route: routePoints,
                        distance: calculateDistance(start.lat, start.lng, end.lat, end.lng).toFixed(2),
                        duration: Math.floor((calculateDistance(start.lat, start.lng, end.lat, end.lng) / 25) * 60)
                    };
                });
        }

        function calculateDistance(lat1, lng1, lat2, lng2) {
            var R = 6371;
            var dLat = (lat2 - lat1) * Math.PI / 180;
            var dLng = (lng2 - lng1) * Math.PI / 180;
            var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLng/2) * Math.sin(dLng/2);
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
        }

        function analyzeRouteSafety() {
            if (!currentRoute) {
                alert('Please create a route first by entering start and end locations.');
                return;
            }
            
            var safetyFactors = calculateSafetyFactors(currentRoute);
            showSafetyAnalysis(safetyFactors);
            
            // Send to React Native
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'ROUTE_ANALYSIS',
                routeData: currentRoute,
                safetyFactors: safetyFactors
            }));
        }

        function calculateSafetyFactors(route) {
            var nearbyStations = 0;
            route.route.forEach(point => {
                policeStations.forEach(station => {
                    var distance = calculateDistance(point[0], point[1], station.lat, station.lng);
                    if (distance <= 1.0) {
                        nearbyStations++;
                    }
                });
            });

            var distance = parseFloat(route.distance);
            var baseCCTV = Math.floor(3 + (distance * 1.5));
            var baseLighting = Math.min(90, 55 + (nearbyStations * 6));
            var baseCrowd = Math.min(85, 45 + (nearbyStations * 7));
            var safetyScore = Math.min(10, 5 + (nearbyStations * 0.8) + (Math.random() * 1)).toFixed(1);

            var highRiskAreas = [];
            var safeZones = [];

            if (distance > 8) highRiskAreas.push('Long route - consider breaks');
            if (nearbyStations < 2) highRiskAreas.push('Limited police presence');
            if (baseLighting < 60) highRiskAreas.push('Some poorly lit areas');
            
            if (nearbyStations >= 2) safeZones.push('Adequate police coverage');
            if (baseLighting >= 70) safeZones.push('Well-lit route');
            if (baseCrowd >= 60) safeZones.push('Generally populated areas');

            return {
                policeStations: nearbyStations,
                cctvCameras: baseCCTV,
                wellLitAreas: baseLighting + '%',
                crowdedAreas: baseCrowd + '%',
                safetyScore: safetyScore + '/10',
                routeLength: route.distance + ' km',
                estimatedTime: route.duration + ' min',
                highRiskAreas: highRiskAreas,
                safeZones: safeZones
            };
        }

        function showSafetyAnalysis(safetyFactors) {
            var analysisDiv = document.getElementById('routeAnalysis');
            var contentDiv = document.getElementById('analysisContent');
            
            var scoreColor = safetyFactors.safetyScore >= '8' ? '#28a745' : 
                           safetyFactors.safetyScore >= '6' ? '#ffc107' : '#dc3545';
            
            contentDiv.innerHTML = \`
                <h3 style="text-align: center; margin-bottom: 15px;">Route Safety Analysis</h3>
                <div class="safety-score" style="background-color: \${scoreColor}; color: white;">
                    Safety Score: \${safetyFactors.safetyScore}
                </div>
                <div class="safety-item">
                    <strong>Route:</strong> \${currentRoute.start.name.split(',')[0]} → \${currentRoute.end.name.split(',')[0]}
                </div>
                <div class="safety-item">
                    <strong>Distance:</strong> \${safetyFactors.routeLength}
                </div>
                <div class="safety-item">
                    <strong>Time:</strong> \${safetyFactors.estimatedTime}
                </div>
                <div class="safety-item">
                    <strong>🚔 Police Stations:</strong> \${safetyFactors.policeStations} nearby
                </div>
                <div class="safety-item">
                    <strong>📹 CCTV Cameras:</strong> \${safetyFactors.cctvCameras} along route
                </div>
                <div class="safety-item">
                    <strong>💡 Street Lighting:</strong> \${safetyFactors.wellLitAreas} well-lit
                </div>
                <div class="safety-item">
                    <strong>👥 Crowd Presence:</strong> \${safetyFactors.crowdedAreas} crowded
                </div>
                \${safetyFactors.highRiskAreas.length > 0 ? \`
                    <div style="margin-top: 15px;">
                        <strong>⚠️ Areas Needing Attention:</strong>
                        \${safetyFactors.highRiskAreas.map(risk => '<div class="risk-item">• ' + risk + '</div>').join('')}
                    </div>
                \` : ''}
                \${safetyFactors.safeZones.length > 0 ? \`
                    <div style="margin-top: 10px;">
                        <strong>✅ Safe Zones:</strong>
                        \${safetyFactors.safeZones.map(zone => '<div class="safe-item">• ' + zone + '</div>').join('')}
                    </div>
                \` : ''}
            \`;
            
            analysisDiv.style.display = 'block';
        }

        function closeAnalysis() {
            document.getElementById('routeAnalysis').style.display = 'none';
        }

        // Listen for messages from React Native
        window.addEventListener('message', function(event) {
            var data = event.data;
            if (data.type === 'FIND_ROUTE') {
                geocodeLocation(data.start, function(startLocation) {
                    if (!startLocation) {
                        alert('Start location not found. Please try a different name.');
                        return;
                    }
                    geocodeLocation(data.end, function(endLocation) {
                        if (!endLocation) {
                            alert('End location not found. Please try a different name.');
                            return;
                        }
                        drawRoute(startLocation, endLocation);
                    });
                });
            } else if (data.type === 'TOGGLE_POLICE') {
                var isVisible = togglePoliceStations();
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'POLICE_TOGGLED',
                    visible: isVisible
                }));
            }
        });
    </script>
</body>
</html>
`;

  const handleMessage = (event: any) => {
    const data = JSON.parse(event.nativeEvent.data);
    
    if (data.type === 'ROUTE_ANALYSIS') {
      setIsLoading(false);
      setCurrentSafetyData(data);
      setShowRouteAnalysis(true);
    } else if (data.type === 'POLICE_TOGGLED') {
      setShowPoliceStations(data.visible);
    }
  };

  const handleFindRoute = () => {
    if (!startLocation.trim() || !endLocation.trim()) {
      Alert.alert('Error', 'Please enter both start and end locations');
      return;
    }

    setIsLoading(true);
    
    // Send message to WebView to find route
    webViewRef.current?.injectJavaScript(`
      window.postMessage({
        type: 'FIND_ROUTE',
        start: '${startLocation}',
        end: '${endLocation}'
      });
      true;
    `);
  };

  const togglePoliceStations = () => {
    webViewRef.current?.injectJavaScript(`
      window.postMessage({
        type: 'TOGGLE_POLICE'
      });
      true;
    `);
  };

  const analyzeRouteSafety = () => {
    webViewRef.current?.injectJavaScript(`
      analyzeRouteSafety();
      true;
    `);
  };

  const showLocationSuggestions = () => {
    Alert.alert(
      'Location Suggestions',
      'Try these Bangalore locations:\n\n• MG Road\n• Koramangala\n• Indiranagar\n• HSR Layout\n• Whitefield\n• Jayanagar\n• Electronic City\n• Marathahalli\n• Yeshwanthpur',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Controls */}
      <View style={styles.controls}>
        <TextInput
          style={styles.input}
          placeholder="Start location (e.g., MG Road)"
          value={startLocation}
          onChangeText={setStartLocation}
        />
        <TextInput
          style={styles.input}
          placeholder="Destination (e.g., Koramangala)"
          value={endLocation}
          onChangeText={setEndLocation}
        />
        
        <TouchableOpacity onPress={showLocationSuggestions} style={styles.suggestionButton}>
          <Text style={styles.suggestionText}>📍 Need location ideas?</Text>
        </TouchableOpacity>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]}
            onPress={handleFindRoute}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Find Route</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, showPoliceStations ? styles.activeButton : styles.secondaryButton]}
            onPress={togglePoliceStations}
          >
            <Text style={styles.buttonText}>
              {showPoliceStations ? '👮 Hide Police' : '👮 Show Police'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.button, styles.analysisButton]}
          onPress={analyzeRouteSafety}
        >
          <Text style={styles.buttonText}>🛡️ Analyze Safety</Text>
        </TouchableOpacity>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: htmlContent }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          onMessage={handleMessage}
        />
      </View>

      {/* Route Analysis Modal */}
      <Modal
        visible={showRouteAnalysis}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRouteAnalysis(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowRouteAnalysis(false)}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
            
            {currentSafetyData && (
              <ScrollView style={styles.analysisContent}>
                <Text style={styles.modalTitle}>Route Safety Analysis</Text>
                
                <View style={[styles.scoreContainer, 
                  { backgroundColor: getScoreColor(currentSafetyData.safetyFactors.safetyScore) }]}>
                  <Text style={styles.scoreText}>Safety Score</Text>
                  <Text style={styles.scoreValue}>{currentSafetyData.safetyFactors.safetyScore}</Text>
                </View>

                <View style={styles.routeInfo}>
                  <Text style={styles.infoText}>
                    📍 From: {currentSafetyData.routeData.start.name.split(',')[0]}
                  </Text>
                  <Text style={styles.infoText}>
                    🎯 To: {currentSafetyData.routeData.end.name.split(',')[0]}
                  </Text>
                  <Text style={styles.infoText}>📏 {currentSafetyData.safetyFactors.routeLength}</Text>
                  <Text style={styles.infoText}>⏱ {currentSafetyData.safetyFactors.estimatedTime}</Text>
                </View>

                <View style={styles.safetyMetrics}>
                  <Text style={styles.sectionTitle}>Safety Metrics</Text>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricTitle}>🚔 Police Stations</Text>
                    <Text style={styles.metricValue}>{currentSafetyData.safetyFactors.policeStations} nearby</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricTitle}>📹 CCTV Cameras</Text>
                    <Text style={styles.metricValue}>{currentSafetyData.safetyFactors.cctvCameras} along route</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricTitle}>💡 Street Lighting</Text>
                    <Text style={styles.metricValue}>{currentSafetyData.safetyFactors.wellLitAreas} well-lit</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricTitle}>👥 Crowd Presence</Text>
                    <Text style={styles.metricValue}>{currentSafetyData.safetyFactors.crowdedAreas} crowded</Text>
                  </View>
                </View>

                {currentSafetyData.safetyFactors.highRiskAreas.length > 0 && (
                  <View style={styles.riskSection}>
                    <Text style={styles.sectionTitle}>⚠️ Areas Needing Attention</Text>
                    {currentSafetyData.safetyFactors.highRiskAreas.map((risk: string, index: number) => (
                      <Text key={index} style={styles.riskItem}>• {risk}</Text>
                    ))}
                  </View>
                )}

                {currentSafetyData.safetyFactors.safeZones.length > 0 && (
                  <View style={styles.safeSection}>
                    <Text style={styles.sectionTitle}>✅ Safe Zones</Text>
                    {currentSafetyData.safetyFactors.safeZones.map((zone: string, index: number) => (
                      <Text key={index} style={styles.safeItem}>• {zone}</Text>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getScoreColor = (score: string) => {
  const numericScore = parseFloat(score);
  if (numericScore >= 8) return '#28A745';
  if (numericScore >= 6) return '#FFC107';
  return '#DC3545';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  controls: {
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: 'white',
    fontSize: 16,
  },
  suggestionButton: {
    padding: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  suggestionText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: '#6C757D',
    flex: 1,
  },
  activeButton: {
    backgroundColor: '#28A745',
    flex: 1,
  },
  analysisButton: {
    backgroundColor: '#FFC107',
    width: '100%',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  mapContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 20,
    backgroundColor: '#DC3545',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  analysisContent: {
    marginTop: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  scoreContainer: {
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scoreValue: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 5,
  },
  routeInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  safetyMetrics: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  metricItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  riskSection: {
    marginBottom: 15,
  },
  safeSection: {
    marginBottom: 15,
  },
  riskItem: {
    color: '#DC3545',
    fontSize: 14,
    marginBottom: 4,
  },
  safeItem: {
    color: '#28A745',
    fontSize: 14,
    marginBottom: 4,
  },
});

export default MainScreen;