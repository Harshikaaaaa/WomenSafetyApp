import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

const MainScreen: React.FC = () => {
  const [startLocation, setStartLocation] = useState<string>('');
  const [endLocation, setEndLocation] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRouteLoading, setIsRouteLoading] = useState<boolean>(false);
  const [showPoliceStations, setShowPoliceStations] = useState<boolean>(false);
  const [showRouteAnalysis, setShowRouteAnalysis] = useState<boolean>(false);
  const [currentSafetyData, setCurrentSafetyData] = useState<any>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState<boolean>(false);
  const [routeOptions, setRouteOptions] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  
  const webViewRef = useRef<WebView>(null);
  const headerHeight = useRef(new Animated.Value(120)).current;

  // Emergency contacts - you can customize these
  const EMERGENCY_NUMBER = '100'; // Police emergency number in India
  const TRUSTED_CONTACT = '911'; // Change this to your trusted contact number

  // Get user's current location
  const getUserLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to share your location');
        return null;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setUserLocation({ latitude, longitude });
      return { latitude, longitude };
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Could not get your current location');
      return null;
    }
  };

  // Emergency call function
  const handleEmergencyCall = () => {
    Alert.alert(
      'Emergency Call',
      'Do you want to call emergency services?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Call',
          onPress: () => {
            Linking.openURL(`tel:${EMERGENCY_NUMBER}`).catch(err => {
              Alert.alert('Error', 'Could not make the call');
              console.error('Error opening dialer:', err);
            });
          }
        }
      ]
    );
  };

  // Share location via SMS
  const handleShareLocation = async () => {
    try {
      const location = await getUserLocation();
      if (!location) return;

      const { latitude, longitude } = location;
      
      // Create Google Maps link
      const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      const message = `EMERGENCY: I need help! My current location: ${mapsUrl}`;
      
      Linking.openURL(`sms:${TRUSTED_CONTACT}?body=${encodeURIComponent(message)}`).catch(err => {
        Alert.alert('Error', 'Could not open messaging app');
        console.error('Error opening SMS:', err);
      });
    } catch (error) {
      console.error('Error sharing location:', error);
      Alert.alert('Error', 'Could not share location');
    }
  };

  const toggleHeader = () => {
    const toValue = isHeaderExpanded ? 120 : 200;
    setIsHeaderExpanded(!isHeaderExpanded);
    
    Animated.timing(headerHeight, {
      toValue: toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleMessage = (event: any) => {
    const data = JSON.parse(event.nativeEvent.data);
    
    if (data.type === 'ROUTE_ANALYSIS') {
      setIsLoading(false);
      setIsRouteLoading(false);
      setCurrentSafetyData(data);
      setShowRouteAnalysis(true);
      setSelectedRouteIndex(data.routeIndex);
    } else if (data.type === 'POLICE_TOGGLED') {
      setShowPoliceStations(data.visible);
    } else if (data.type === 'ROUTES_READY') {
      setIsRouteLoading(false);
      setIsLoading(false);
      
      // Sort routes by safety score to ensure consistent ordering
      const sortedRoutes = data.routes.sort((a: any, b: any) => {
        return parseFloat(b.safetyFactors.safetyScore) - parseFloat(a.safetyFactors.safetyScore);
      });
      
      // Assign consistent colors and labels based on safety ranking
      const consistentRoutes = sortedRoutes.map((route: any, index: number) => {
        let color, label;
        
        // Always assign colors based on safety ranking
        if (index === 0) {
          color = '#28a745'; // Green for safest
          label = 'Safest Route';
        } else if (index === 1) {
          color = '#ffc107'; // Yellow for balanced
          label = 'Balanced Route';
        } else {
          color = '#dc3545'; // Red for fastest/least safe
          label = 'Fastest Route';
        }
        
        return {
          ...route,
          color,
          label,
          originalIndex: route.index // Keep track of original index
        };
      });
      
      setRouteOptions(consistentRoutes);
    } else if (data.type === 'ROUTE_ERROR') {
      setIsRouteLoading(false);
      setIsLoading(false);
      Alert.alert('Error', 'Could not find route. Please try different locations.');
    } else if (data.type === 'ROUTE_SELECTED') {
      setSelectedRouteIndex(data.index);
    }
  };

  const handleFindRoute = () => {
    if (!startLocation.trim() || !endLocation.trim()) {
      Alert.alert('Error', 'Please enter both start and end locations');
      return;
    }

    setIsLoading(true);
    setIsRouteLoading(true);
    
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

  const toggleHeatmap = () => {
    webViewRef.current?.injectJavaScript(`
      toggleHeatmap();
      true;
    `);
  };

  const analyzeRouteSafety = () => {
    if (routeOptions.length === 0) {
      Alert.alert('No Routes', 'Please generate routes first by clicking "Find Routes"');
      return;
    }
    
    setIsLoading(true);
    webViewRef.current?.injectJavaScript(`
      analyzeCurrentRoute();
      true;
    `);
  };

  const analyzeSpecificRoute = (index: number) => {
    setSelectedRouteIndex(index);
    setIsLoading(true);
    
    // Use the original index for the WebView communication
    const originalIndex = routeOptions[index]?.originalIndex || index;
    
    webViewRef.current?.injectJavaScript(`
      selectRoute(${originalIndex});
      setTimeout(function() {
        analyzeSpecificRoute(${originalIndex});
      }, 100);
      true;
    `);
  };

  const selectRoute = (index: number) => {
    setSelectedRouteIndex(index);
    
    // Use the original index for the WebView communication
    const originalIndex = routeOptions[index]?.originalIndex || index;
    
    webViewRef.current?.injectJavaScript(`
      selectRoute(${originalIndex});
      true;
    `);
  };

  const showLocationSuggestions = () => {
    Alert.alert(
      'Location Suggestions',
      'Try these Bangalore locations:\n\n• MG Road\n• Koramangala\n• Indiranagar\n• HSR Layout\n• Whitefield\n• Jayanagar\n• Electronic City\n• Marathahalli\n• Yeshwanthpur\n• Yelahanka\n• Kengeri',
      [{ text: 'OK' }]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: () => router.replace('/login') }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Compact Header */}
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        {/* Header Top Bar */}
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutButtonText}>👤</Text>
          </TouchableOpacity>
          
          {/* Location display when collapsed */}
          {!isHeaderExpanded && (
            <View style={styles.compactLocation}>
              <Text style={styles.compactLocationText} numberOfLines={1}>
                📍 {startLocation || 'Start'} → {endLocation || 'End'}
              </Text>
            </View>
          )}
          
          <TouchableOpacity onPress={toggleHeader} style={styles.expandButton}>
            <Text style={styles.expandButtonText}>
              {isHeaderExpanded ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Inputs - Always Visible */}
        <View style={styles.searchSection}>
          <TextInput
            style={styles.input}
            placeholder="Start location"
            value={startLocation}
            onChangeText={setStartLocation}
          />
          <TextInput
            style={styles.input}
            placeholder="Destination"
            value={endLocation}
            onChangeText={setEndLocation}
          />
        </View>

        {/* Quick Actions - Always Visible */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={[styles.quickButton, styles.primaryButton]}
            onPress={handleFindRoute}
            disabled={isLoading}
          >
            <Text style={styles.quickButtonText}>📍 Find Routes</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.quickButton, showPoliceStations ? styles.activeButton : styles.secondaryButton]}
            onPress={togglePoliceStations}
          >
            <Text style={styles.quickButtonText}>
              {showPoliceStations ? '👮 Hide' : '👮 Show'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickButton, styles.heatmapButton]}
            onPress={toggleHeatmap}
          >
            <Text style={styles.quickButtonText}>🔥 Heatmap</Text>
          </TouchableOpacity>
        </View>

        {/* Expandable Section - Only shows when expanded */}
        {isHeaderExpanded && (
          <View style={styles.expandableSection}>
            <TouchableOpacity onPress={showLocationSuggestions} style={styles.suggestionButton}>
              <Text style={styles.suggestionText}>📍 Need location ideas?</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.analysisButton]}
              onPress={analyzeRouteSafety}
              disabled={isLoading || routeOptions.length === 0}
            >
              {isLoading && !isRouteLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>🛡️ Analyze Route Safety</Text>
              )}
            </TouchableOpacity>

            {/* Route quick info when available */}
            {routeOptions.length > 0 && (
              <View style={styles.quickRouteInfo}>
                <Text style={styles.quickRouteTitle}>Available Routes:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {routeOptions.map((route, index) => (
                    <TouchableOpacity 
                      key={index}
                      style={[
                        styles.quickRouteItem,
                        selectedRouteIndex === index && styles.selectedQuickRoute
                      ]}
                      onPress={() => selectRoute(index)}
                    >
                      <View style={[styles.routeColorDot, { backgroundColor: route.color }]} />
                      <Text style={styles.quickRouteText}>
                        {route.label.split(' ')[0]}
                      </Text>
                      <Text style={styles.quickRouteScore}>
                        {route.safetyFactors.safetyScore}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}
      </Animated.View>

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

      {/* Emergency Buttons at Bottom */}
      <View style={styles.emergencyContainer}>
        <TouchableOpacity 
          style={[styles.emergencyButton, styles.callButton]}
          onPress={handleEmergencyCall}
        >
          <Text style={styles.emergencyIcon}>📞</Text>
          <Text style={styles.emergencyText}>Emergency Call</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.emergencyButton, styles.locationButton]}
          onPress={handleShareLocation}
        >
          <Text style={styles.emergencyIcon}>📍</Text>
          <Text style={styles.emergencyText}>Share Location</Text>
        </TouchableOpacity>
      </View>

      {/* Loading Overlay */}
      {isRouteLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Finding Routes...</Text>
            <Text style={styles.loadingSubtext}>Calculating 3 different route options for you</Text>
          </View>
        </View>
      )}

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
              <ScrollView style={styles.analysisContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>
                  {currentSafetyData.routeData.label} - Safety Report
                </Text>
                
                <View style={[styles.scoreContainer, 
                  { backgroundColor: getScoreColor(currentSafetyData.safetyFactors.safetyScore) }]}>
                  <Text style={styles.scoreText}>Overall Safety Score</Text>
                  <Text style={styles.scoreValue}>{currentSafetyData.safetyFactors.safetyScore}</Text>
                  <Text style={styles.scoreDescription}>
                    {getScoreDescription(currentSafetyData.safetyFactors.safetyScore)}
                  </Text>
                </View>

                <View style={styles.routeInfo}>
                  <Text style={styles.infoTitle}>Route Information</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>📍 Start:</Text>
                    <Text style={styles.infoValue}>{currentSafetyData.routeData.start.name.split(',')[0]}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>🎯 Destination:</Text>
                    <Text style={styles.infoValue}>{currentSafetyData.routeData.end.name.split(',')[0]}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>📏 Distance:</Text>
                    <Text style={styles.infoValue}>{currentSafetyData.safetyFactors.routeLength}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>⏱ Estimated Time:</Text>
                    <Text style={styles.infoValue}>{currentSafetyData.safetyFactors.estimatedTime}</Text>
                  </View>
                </View>

                {/* Safety Metrics Grid */}
                <View style={styles.safetyMetrics}>
                  <Text style={styles.sectionTitle}>Safety Metrics</Text>
                  
                  <View style={styles.metricsGrid}>
                    <View style={styles.metricCard}>
                      <Text style={styles.metricIcon}>🚔</Text>
                      <Text style={styles.metricValue}>{currentSafetyData.safetyFactors.policeStations}</Text>
                      <Text style={styles.metricLabel}>Police Stations</Text>
                      <Text style={styles.metricDescription}>Within 3km of route</Text>
                    </View>
                    
                    <View style={styles.metricCard}>
                      <Text style={styles.metricIcon}>📹</Text>
                      <Text style={styles.metricValue}>{currentSafetyData.safetyFactors.cctvCameras}</Text>
                      <Text style={styles.metricLabel}>CCTV Cameras</Text>
                      <Text style={styles.metricDescription}>Estimated coverage</Text>
                    </View>
                    
                    <View style={styles.metricCard}>
                      <Text style={styles.metricIcon}>💡</Text>
                      <Text style={styles.metricValue}>{currentSafetyData.safetyFactors.wellLitAreas}</Text>
                      <Text style={styles.metricLabel}>Well Lit</Text>
                      <Text style={styles.metricDescription}>Street lighting</Text>
                    </View>
                    
                    <View style={styles.metricCard}>
                      <Text style={styles.metricIcon}>👥</Text>
                      <Text style={styles.metricValue}>{currentSafetyData.safetyFactors.crowdedAreas}</Text>
                      <Text style={styles.metricLabel}>Crowded Areas</Text>
                      <Text style={styles.metricDescription}>Good visibility</Text>
                    </View>
                  </View>
                </View>

                {/* Police Stations Details */}
                {currentSafetyData.safetyFactors.policeStationsDetailed && currentSafetyData.safetyFactors.policeStationsDetailed.length > 0 && (
                  <View style={styles.policeStationsSection}>
                    <Text style={styles.sectionTitle}>🚔 Police Stations Nearby</Text>
                    <Text style={styles.policeStationsSubtitle}>
                      {currentSafetyData.safetyFactors.policeStations} stations within 3km of your route
                    </Text>
                    {currentSafetyData.safetyFactors.policeStationsDetailed.slice(0, 5).map((station: any, index: number) => (
                      <View key={index} style={styles.policeStationItem}>
                        <Text style={styles.policeStationName}>{station.name}</Text>
                        <Text style={styles.policeStationDistance}>{station.distance} km from route</Text>
                      </View>
                    ))}
                    {currentSafetyData.safetyFactors.policeStationsDetailed.length > 5 && (
                      <Text style={styles.moreStationsText}>
                        +{currentSafetyData.safetyFactors.policeStationsDetailed.length - 5} more stations nearby
                      </Text>
                    )}
                  </View>
                )}

                {/* Risk Areas */}
                {currentSafetyData.safetyFactors.highRiskAreas.length > 0 && (
                  <View style={styles.riskSection}>
                    <Text style={styles.sectionTitle}>⚠️ Areas Needing Attention</Text>
                    {currentSafetyData.safetyFactors.highRiskAreas.map((risk: string, index: number) => (
                      <View key={index} style={styles.riskItem}>
                        <Text style={styles.riskBullet}>•</Text>
                        <Text style={styles.riskText}>{risk}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Safe Zones */}
                {currentSafetyData.safetyFactors.safeZones.length > 0 && (
                  <View style={styles.safeSection}>
                    <Text style={styles.sectionTitle}>✅ Safe Zones</Text>
                    {currentSafetyData.safetyFactors.safeZones.map((zone: string, index: number) => (
                      <View key={index} style={styles.safeItem}>
                        <Text style={styles.safeBullet}>•</Text>
                        <Text style={styles.safeText}>{zone}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Safety Recommendations */}
                <View style={styles.recommendations}>
                  <Text style={styles.sectionTitle}>🛡️ Safety Recommendations</Text>
                  <View style={styles.recommendationItem}>
                    <Text style={styles.recommendationBullet}>•</Text>
                    <Text style={styles.recommendationText}>Share your live location with trusted contacts</Text>
                  </View>
                  <View style={styles.recommendationItem}>
                    <Text style={styles.recommendationBullet}>•</Text>
                    <Text style={styles.recommendationText}>Keep emergency numbers handy</Text>
                  </View>
                  <View style={styles.recommendationItem}>
                    <Text style={styles.recommendationBullet}>•</Text>
                    <Text style={styles.recommendationText}>Avoid poorly lit areas after dark</Text>
                  </View>
                  <View style={styles.recommendationItem}>
                    <Text style={styles.recommendationBullet}>•</Text>
                    <Text style={styles.recommendationText}>Stay aware of your surroundings</Text>
                  </View>
                  {parseFloat(currentSafetyData.safetyFactors.safetyScore) < 7 && (
                    <View style={styles.recommendationItem}>
                      <Text style={styles.recommendationBullet}>•</Text>
                      <Text style={[styles.recommendationText, styles.importantRecommendation]}>
                        Consider alternative transportation during late hours
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity 
                  style={styles.closeAnalysisButton}
                  onPress={() => setShowRouteAnalysis(false)}
                >
                  <Text style={styles.closeAnalysisButtonText}>Close Analysis</Text>
                </TouchableOpacity>
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
  if (numericScore >= 7) return '#FFC107';
  if (numericScore >= 6) return '#FF9800';
  return '#DC3545';
};

const getScoreDescription = (score: string) => {
  const numericScore = parseFloat(score);
  if (numericScore >= 8) return 'Very Safe';
  if (numericScore >= 7) return 'Safe';
  if (numericScore >= 6) return 'Moderately Safe';
  return 'Needs Caution';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingHorizontal: 15,
    paddingTop: 40,
    paddingBottom: 10,
    overflow: 'hidden',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactLocation: {
    flex: 1,
    marginHorizontal: 10,
  },
  compactLocationText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  logoutButton: {
    padding: 5,
  },
  logoutButtonText: {
    fontSize: 18,
  },
  expandButton: {
    padding: 5,
  },
  expandButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  searchSection: {
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    backgroundColor: 'white',
    fontSize: 12,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  quickButton: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  quickButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 10,
  },
  expandableSection: {
    marginTop: 5,
  },
  suggestionButton: {
    padding: 6,
    alignItems: 'center',
    marginBottom: 6,
  },
  suggestionText: {
    color: '#007AFF',
    fontSize: 11,
    fontWeight: '500',
  },
  button: {
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 6,
  },
  analysisButton: {
    backgroundColor: '#FFC107',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 11,
  },
  quickRouteInfo: {
    marginTop: 8,
  },
  quickRouteTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5,
  },
  quickRouteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 6,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedQuickRoute: {
    borderColor: '#007AFF',
    backgroundColor: '#e7f3ff',
  },
  routeColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  quickRouteText: {
    fontSize: 10,
    color: '#333',
    marginRight: 4,
  },
  quickRouteScore: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  mapContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  // Emergency buttons container
  emergencyContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  emergencyButton: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    minHeight: 70,
    justifyContent: 'center',
  },
  callButton: {
    backgroundColor: '#DC3545',
  },
  locationButton: {
    backgroundColor: '#007AFF',
  },
  emergencyIcon: {
    fontSize: 20,
    marginBottom: 5,
  },
  emergencyText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingSubtext: {
    marginTop: 5,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
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
    maxHeight: '90%',
    minHeight: '50%',
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
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  scoreContainer: {
    padding: 25,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scoreValue: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 5,
  },
  scoreDescription: {
    color: 'white',
    fontSize: 14,
    marginTop: 5,
    fontWeight: '500',
  },
  routeInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  safetyMetrics: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  metricIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 2,
  },
  metricDescription: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
  },
  policeStationsSection: {
    backgroundColor: '#e7f3ff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  policeStationsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  policeStationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#cce7ff',
  },
  policeStationName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  policeStationDistance: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  moreStationsText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
    textAlign: 'center',
  },
  riskSection: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#fff3cd',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  safeSection: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#d4edda',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  riskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  riskBullet: {
    color: '#856404',
    fontSize: 14,
    marginRight: 8,
    fontWeight: 'bold',
  },
  riskText: {
    color: '#856404',
    fontSize: 14,
    flex: 1,
  },
  safeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  safeBullet: {
    color: '#155724',
    fontSize: 14,
    marginRight: 8,
    fontWeight: 'bold',
  },
  safeText: {
    color: '#155724',
    fontSize: 14,
    flex: 1,
  },
  recommendations: {
    backgroundColor: '#e7f3ff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recommendationBullet: {
    color: '#004085',
    fontSize: 14,
    marginRight: 8,
    fontWeight: 'bold',
  },
  recommendationText: {
    fontSize: 14,
    color: '#004085',
    flex: 1,
    lineHeight: 20,
  },
  importantRecommendation: {
    fontWeight: 'bold',
    color: '#dc3545',
  },
  closeAnalysisButton: {
    backgroundColor: '#6C757D',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  closeAnalysisButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#6C757D',
  },
  activeButton: {
    backgroundColor: '#28A745',
  },
  heatmapButton: {
    backgroundColor: '#FF6B35',
  },
});

// Updated HTML content with fixed route color assignment
const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
    <script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
    <style>
        body { margin: 0; padding: 0; }
        #map { height: 100vh; width: 100vw; }
        .police-icon { background: #dc3545; border-radius: 50%; }
        .route-police-icon { background: #28a745; border-radius: 50%; }
        .loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255,255,255,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            display: none;
        }
        .route-controls {
            position: absolute;
            top: 10px;
            left: 10px;
            background: white;
            padding: 10px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 1000;
            display: none;
        }
        .route-button-container {
            display: flex;
            align-items: center;
            margin: 2px 0;
        }
        .route-button {
            flex: 1;
            border: none;
            padding: 8px 12px;
            border-radius: 5px;
            font-size: 10px;
            cursor: pointer;
            color: white;
            margin-right: 4px;
        }
        .shield-button {
            background: #007AFF;
            border: none;
            padding: 6px 8px;
            border-radius: 5px;
            cursor: pointer;
            color: white;
            font-size: 10px;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <div id="loadingOverlay" class="loading-overlay">
        <div style="background: white; padding: 20px; border-radius: 10px; text-align: center;">
            <h3>Finding Routes...</h3>
            <p>Please wait while we calculate your routes</p>
        </div>
    </div>
    <div id="routeControls" class="route-controls">
        <div id="routeButtons"></div>
    </div>

    <script>
        var map = L.map('map').setView([12.9716, 77.5946], 12);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        var policeMarkers = [];
        var routePoliceMarkers = [];
        var routePolylines = [];
        var startMarker = null;
        var endMarker = null;
        var currentRoutes = [];
        var allPoliceStations = [];
        var selectedRouteIndex = 0;
        var routesCompleted = 0;
        var totalRoutesExpected = 3;
        var heatmapLayer = null;
        var isHeatmapVisible = false;
        var heatmapUpdateInterval = null;

        // Hardcoded Bangalore police stations for route analysis
        var hardcodedPoliceStations = [
            {name: "Cubbon Park Police Station", lat: 12.9768, lng: 77.5953, type: "police_station"},
            {name: "Commercial Street Police Station", lat: 12.9815, lng: 77.6082, type: "police_station"},
            {name: "Ashok Nagar Police Station", lat: 12.9784, lng: 77.5778, type: "police_station"},
            {name: "Ulsoor Police Station", lat: 12.9789, lng: 77.6214, type: "police_station"},
            {name: "HSR Layout Police Station", lat: 12.9116, lng: 77.6473, type: "police_station"},
            {name: "Koramangala Police Station", lat: 12.9348, lng: 77.6264, type: "police_station"},
            {name: "Jayanagar Police Station", lat: 12.9302, lng: 77.5834, type: "police_station"},
            {name: "Indiranagar Police Station", lat: 12.9782, lng: 77.6408, type: "police_station"},
            {name: "Whitefield Police Station", lat: 12.9698, lng: 77.7499, type: "police_station"},
            {name: "Yeshwanthpur Police Station", lat: 13.0256, lng: 77.5485, type: "police_station"},
            {name: "Madiwala Police Station", lat: 12.9185, lng: 77.6198, type: "police_station"},
            {name: "BTM Layout Police Station", lat: 12.9167, lng: 77.6100, type: "police_station"},
            {name: "Banashankari Police Station", lat: 12.9254, lng: 77.5468, type: "police_station"},
            {name: "J.P. Nagar Police Station", lat: 12.9123, lng: 77.5856, type: "police_station"},
            {name: "Basavanagudi Police Station", lat: 12.9416, lng: 77.5733, type: "police_station"},
            {name: "Shivajinagar Police Station", lat: 12.9818, lng: 77.6023, type: "police_station"},
            {name: "Vijayanagar Police Station", lat: 12.9692, lng: 77.5332, type: "police_station"},
            {name: "Rajajinagar Police Station", lat: 12.9916, lng: 77.5512, type: "police_station"},
            {name: "Malleshwaram Police Station", lat: 13.0069, lng: 77.5751, type: "police_station"},
            {name: "Seshadripuram Police Station", lat: 12.9982, lng: 77.5821, type: "police_station"},
            {name: "Frazer Town Police Station", lat: 12.9989, lng: 77.6128, type: "police_station"},
            {name: "RT Nagar Police Station", lat: 13.0286, lng: 77.5934, type: "police_station"},
            {name: "Hebbal Police Station", lat: 13.0392, lng: 77.5910, type: "police_station"},
            {name: "Yelahanka Police Station", lat: 13.1007, lng: 77.5963, type: "police_station"},
            {name: "Electronic City Police Station", lat: 12.8456, lng: 77.6651, type: "police_station"},
            {name: "Bommanahalli Police Station", lat: 12.8892, lng: 77.6284, type: "police_station"},
            {name: "Kengeri Police Station", lat: 12.9065, lng: 77.4833, type: "police_station"}
        ];

        // Real-time crowd density simulation with time-based patterns
        function generateRealTimeCrowdData() {
            var now = new Date();
            var hour = now.getHours();
            var minute = now.getMinutes();
            var isWeekend = now.getDay() === 0 || now.getDay() === 6;
            
            // Time-based intensity multipliers
            var timeMultiplier = 1.0;
            if (hour >= 7 && hour <= 9) timeMultiplier = 0.8; // Morning commute
            else if (hour >= 17 && hour <= 19) timeMultiplier = 0.9; // Evening commute
            else if (hour >= 20 && hour <= 23) timeMultiplier = 1.2; // Night life
            else if (hour >= 0 && hour <= 5) timeMultiplier = 0.3; // Late night
            else if (hour >= 12 && hour <= 14) timeMultiplier = 1.1; // Lunch time
            
            if (isWeekend) {
                timeMultiplier *= 1.3; // Higher crowds on weekends
                if (hour >= 11 && hour <= 18) timeMultiplier *= 1.2; // Weekend afternoon peak
            }

            var heatmapData = [];
            
            // Major Bangalore hotspots with dynamic crowd patterns
            var hotspots = [
                // Commercial areas (high variability)
                {lat: 12.9716, lng: 77.5946, base: 0.7, variation: 0.3, peak: [18, 21]}, // MG Road
                {lat: 12.9758, lng: 77.6055, base: 0.8, variation: 0.4, peak: [19, 23]}, // Brigade Road
                {lat: 12.9815, lng: 77.6082, base: 0.6, variation: 0.3, peak: [11, 19]}, // Commercial Street
                
                // IT corridors (commute patterns)
                {lat: 12.9698, lng: 77.7499, base: 0.6, variation: 0.4, peak: [8, 10, 17, 19]}, // Whitefield
                {lat: 12.9569, lng: 77.7011, base: 0.7, variation: 0.5, peak: [8, 11, 17, 20]}, // Marathahalli
                {lat: 12.8456, lng: 77.6651, base: 0.5, variation: 0.4, peak: [8, 10, 17, 19]}, // Electronic City
                
                // Residential + Commercial mix
                {lat: 12.9782, lng: 77.6408, base: 0.5, variation: 0.3, peak: [18, 22]}, // Indiranagar
                {lat: 12.9348, lng: 77.6264, base: 0.6, variation: 0.3, peak: [19, 23]}, // Koramangala
                {lat: 12.9302, lng: 77.5834, base: 0.5, variation: 0.2, peak: [17, 21]}, // Jayanagar
                {lat: 12.9116, lng: 77.6473, base: 0.4, variation: 0.2, peak: [19, 22]}, // HSR Layout
                
                // Transportation hubs
                {lat: 12.9784, lng: 77.5778, base: 0.7, variation: 0.4, peak: [7, 10, 17, 20]}, // Majestic
                {lat: 13.0256, lng: 77.5485, base: 0.4, variation: 0.3, peak: [7, 10, 17, 19]}, // Yeshwanthpur
                
                // Other areas
                {lat: 12.9185, lng: 77.6198, base: 0.5, variation: 0.3, peak: [8, 10, 18, 20]}, // Madiwala
                {lat: 12.9167, lng: 77.6100, base: 0.4, variation: 0.2, peak: [18, 22]}, // BTM Layout
                {lat: 12.9254, lng: 77.5468, base: 0.3, variation: 0.2, peak: [17, 20]}, // Banashankari
                {lat: 12.9416, lng: 77.5733, base: 0.3, variation: 0.2, peak: [17, 20]}, // Basavanagudi
                {lat: 12.9818, lng: 77.6023, base: 0.6, variation: 0.3, peak: [10, 19]}, // Shivajinagar
                {lat: 12.9789, lng: 77.6214, base: 0.3, variation: 0.2, peak: [17, 20]}, // Ulsoor
                {lat: 13.1007, lng: 77.5963, base: 0.2, variation: 0.1, peak: [8, 10, 17, 19]}, // Yelahanka
                {lat: 12.9065, lng: 77.4833, base: 0.2, variation: 0.1, peak: [8, 10, 17, 19]}  // Kengeri
            ];

            // Generate heatmap points for each hotspot
            hotspots.forEach(function(hotspot) {
                var isPeakTime = false;
                for (var i = 0; i < hotspot.peak.length; i += 2) {
                    if (hour >= hotspot.peak[i] && hour <= hotspot.peak[i + 1]) {
                        isPeakTime = true;
                        break;
                    }
                }
                
                var peakMultiplier = isPeakTime ? 1.3 : 1.0;
                var baseIntensity = hotspot.base * timeMultiplier * peakMultiplier;
                
                // Generate multiple points around each hotspot
                for (var i = 0; i < 10; i++) {
                    var lat = hotspot.lat + (Math.random() - 0.5) * 0.015;
                    var lng = hotspot.lng + (Math.random() - 0.5) * 0.015;
                    var randomVariation = (Math.random() - 0.5) * hotspot.variation;
                    var intensity = Math.max(0.1, Math.min(1.0, baseIntensity + randomVariation));
                    
                    heatmapData.push([lat, lng, intensity]);
                }
            });

            // Add random medium-density areas across the city
            for (var i = 0; i < 30; i++) {
                var lat = 12.97 + (Math.random() - 0.5) * 0.3;
                var lng = 77.59 + (Math.random() - 0.5) * 0.3;
                var intensity = 0.2 + Math.random() * 0.4;
                intensity *= timeMultiplier;
                heatmapData.push([lat, lng, Math.min(1.0, intensity)]);
            }

            return heatmapData;
        }

        function startRealTimeUpdates() {
            if (heatmapUpdateInterval) {
                clearInterval(heatmapUpdateInterval);
            }
            
            // Update immediately
            updateHeatmap();
            
            // Update every 10 seconds for real-time feel
            heatmapUpdateInterval = setInterval(function() {
                if (isHeatmapVisible) {
                    updateHeatmap();
                }
            }, 10000);
        }

        function updateHeatmap() {
            var heatmapData = generateRealTimeCrowdData();
            if (heatmapLayer) {
                heatmapLayer.setLatLngs(heatmapData);
            }
        }

        function toggleHeatmap() {
            if (isHeatmapVisible) {
                if (heatmapLayer) {
                    map.removeLayer(heatmapLayer);
                    heatmapLayer = null;
                }
                if (heatmapUpdateInterval) {
                    clearInterval(heatmapUpdateInterval);
                    heatmapUpdateInterval = null;
                }
                isHeatmapVisible = false;
            } else {
                var heatmapData = generateRealTimeCrowdData();
                heatmapLayer = L.heatLayer(heatmapData, {
                    radius: 25,
                    blur: 15,
                    maxZoom: 17,
                    gradient: {
                        0.2: 'green',    // Low density
                        0.5: 'yellow',   // Medium density
                        0.8: 'red'       // High density
                    }
                }).addTo(map);
                isHeatmapVisible = true;
                startRealTimeUpdates();
            }
        }

        function showLoading() {
            document.getElementById('loadingOverlay').style.display = 'flex';
        }

        function hideLoading() {
            document.getElementById('loadingOverlay').style.display = 'none';
        }

        function showRouteControls() {
            document.getElementById('routeControls').style.display = 'block';
        }

        function hideRouteControls() {
            document.getElementById('routeControls').style.display = 'none';
        }

        function createPoliceIcon(isRoutePolice = false) {
            var color = isRoutePolice ? '#28a745' : '#dc3545';
            return L.divIcon({
                className: isRoutePolice ? 'route-police-icon' : 'police-icon',
                html: '<div style="background-color: ' + color + '; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });
        }

        // Get police stations from OpenStreetMap using Overpass API
        function getPoliceStationsFromOSM(bounds, callback) {
            var southWest = bounds.getSouthWest();
            var northEast = bounds.getNorthEast();
            
            var overpassQuery = \`[out:json][timeout:25];
                (
                    node["amenity"="police"](\${southWest.lat},\${southWest.lng},\${northEast.lat},\${northEast.lng});
                    way["amenity"="police"](\${southWest.lat},\${southWest.lng},\${northEast.lat},\${northEast.lng});
                    relation["amenity"="police"](\${southWest.lat},\${southWest.lng},\${northEast.lat},\${northEast.lng});
                );
                out center;\`;
            
            var url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(overpassQuery);
            
            fetch(url)
                .then(response => response.json())
                .then(data => {
                    var stations = [];
                    if (data && data.elements) {
                        data.elements.forEach(element => {
                            var lat, lng, name;
                            
                            if (element.type === 'node') {
                                lat = element.lat;
                                lng = element.lon;
                            } else if (element.center) {
                                lat = element.center.lat;
                                lng = element.center.lon;
                            } else {
                                return;
                            }
                            
                            name = element.tags.name || element.tags['name:en'] || 'Police Station';
                            stations.push({
                                name: name,
                                lat: lat,
                                lng: lng,
                                type: element.tags['police:type'] || 'police_station'
                            });
                        });
                    }
                    callback(stations);
                })
                .catch(error => {
                    console.error('Error fetching police stations:', error);
                    // Fallback to hardcoded stations if API fails
                    callback(hardcodedPoliceStations);
                });
        }

        function showPoliceStations() {
            policeMarkers.forEach(marker => map.removeLayer(marker));
            policeMarkers = [];
            
            var bounds = map.getBounds();
            getPoliceStationsFromOSM(bounds, function(stations) {
                allPoliceStations = stations;
                
                stations.forEach(station => {
                    var icon = createPoliceIcon();
                    var marker = L.marker([station.lat, station.lng], { icon: icon })
                        .bindPopup('<b>' + station.name + '</b>')
                        .addTo(map);
                    policeMarkers.push(marker);
                });
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

        function showRoutePoliceStations(routePoints) {
            // Clear existing route police markers
            routePoliceMarkers.forEach(marker => map.removeLayer(marker));
            routePoliceMarkers = [];
            
            var maxDistance = 3.0; // 3km radius
            
            // Show police stations near the route as green dots
            hardcodedPoliceStations.forEach(station => {
                var minDistanceToRoute = Number.MAX_VALUE;
                
                // Find minimum distance from this station to any point on the route
                routePoints.forEach(point => {
                    var distance = calculateDistance(point[0], point[1], station.lat, station.lng);
                    if (distance < minDistanceToRoute) {
                        minDistanceToRoute = distance;
                    }
                });
                
                if (minDistanceToRoute <= maxDistance) {
                    var icon = createPoliceIcon(true); // true for green route police icon
                    var marker = L.marker([station.lat, station.lng], { icon: icon })
                        .bindPopup('<b>🛡️ ' + station.name + '</b><br>Distance from route: ' + minDistanceToRoute.toFixed(2) + ' km')
                        .addTo(map);
                    routePoliceMarkers.push(marker);
                }
            });
        }

        function hideRoutePoliceStations() {
            routePoliceMarkers.forEach(marker => map.removeLayer(marker));
            routePoliceMarkers = [];
        }

        function geocodeLocation(query, callback) {
            var url = 'https://nominatim.openstreetmap.org/search?format=json&q=' + 
                     encodeURIComponent(query + ', Bangalore') + '&limit=1';
            
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
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
                    // Fallback to hardcoded locations for common Bangalore areas
                    var hardcodedLocations = {
                        'mg road': {lat: 12.9758, lng: 77.6055, name: 'MG Road, Bangalore'},
                        'koramangala': {lat: 12.9348, lng: 77.6264, name: 'Koramangala, Bangalore'},
                        'indiranagar': {lat: 12.9782, lng: 77.6408, name: 'Indiranagar, Bangalore'},
                        'hsr layout': {lat: 12.9116, lng: 77.6473, name: 'HSR Layout, Bangalore'},
                        'whitefield': {lat: 12.9698, lng: 77.7499, name: 'Whitefield, Bangalore'},
                        'jayanagar': {lat: 12.9302, lng: 77.5834, name: 'Jayanagar, Bangalore'},
                        'electronic city': {lat: 12.8456, lng: 77.6651, name: 'Electronic City, Bangalore'},
                        'marathahalli': {lat: 12.9569, lng: 77.7011, name: 'Marathahalli, Bangalore'},
                        'yeshwanthpur': {lat: 13.0256, lng: 77.5485, name: 'Yeshwanthpur, Bangalore'},
                        'yelahanka': {lat: 13.1007, lng: 77.5963, name: 'Yelahanka, Bangalore'},
                        'kengeri': {lat: 12.9065, lng: 77.4833, name: 'Kengeri, Bangalore'}
                    };
                    
                    var lowerQuery = query.toLowerCase().trim();
                    if (hardcodedLocations[lowerQuery]) {
                        callback(hardcodedLocations[lowerQuery]);
                    } else {
                        callback(null);
                    }
                });
        }

        function drawRoutes(start, end) {
            showLoading();
            routesCompleted = 0;
            currentRoutes = [];
            
            // Clear existing routes and markers
            routePolylines.forEach(polyline => map.removeLayer(polyline));
            routePolylines = [];
            if (startMarker) map.removeLayer(startMarker);
            if (endMarker) map.removeLayer(endMarker);
            routePoliceMarkers.forEach(marker => map.removeLayer(marker));
            routePoliceMarkers = [];
            
            startMarker = L.marker([start.lat, start.lng])
                .bindPopup('<b>Start: ' + start.name + '</b>')
                .addTo(map);
            
            endMarker = L.marker([end.lat, end.lng])
                .bindPopup('<b>End: ' + end.name + '</b>')
                .addTo(map);
            
            // Use hardcoded police stations for route analysis
            allPoliceStations = hardcodedPoliceStations;
            
            // Generate 3 different route options with consistent color assignment
            generateRouteOptions(start, end);
        }

        function generateRouteOptions(start, end) {
            // Generate different route variations using alternative points
            // Always assign colors consistently based on safety ranking
            generateRouteVariation(start, end, 0, '#28a745', 'Safest Route', 0.02);
            generateRouteVariation(start, end, 1, '#ffc107', 'Balanced Route', 0.04);
            generateRouteVariation(start, end, 2, '#dc3545', 'Fastest Route', 0.08);
        }

        function generateRouteVariation(start, end, index, color, label, variationFactor) {
            // Create waypoints to generate different routes
            var midPoint = {
                lat: (start.lat + end.lat) / 2 + (Math.random() - 0.5) * variationFactor,
                lng: (start.lng + end.lng) / 2 + (Math.random() - 0.5) * variationFactor
            };
            
            // Generate route via different waypoints for each variation
            var waypoints = [];
            if (index === 0) {
                // Safest route - try to go through more populated areas
                waypoints = [midPoint];
            } else if (index === 1) {
                // Balanced route - slight variation
                waypoints = [{
                    lat: midPoint.lat + 0.01,
                    lng: midPoint.lng - 0.01
                }];
            } else {
                // Fastest route - more direct but potentially riskier
                waypoints = [{
                    lat: midPoint.lat - 0.01,
                    lng: midPoint.lng + 0.01
                }];
            }
            
            generateRouteWithWaypoints(start, end, waypoints, index, color, label);
        }

        function generateRouteWithWaypoints(start, end, waypoints, index, color, label) {
            var coordinates = [start.lng + ',' + start.lat];
            
            waypoints.forEach(function(point) {
                coordinates.push(point.lng + ',' + point.lat);
            });
            
            coordinates.push(end.lng + ',' + end.lat);
            
            var url = 'https://router.project-osrm.org/route/v1/driving/' + 
                     coordinates.join(';') + 
                     '?overview=full&geometries=geojson&alternatives=0';
            
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.routes && data.routes.length > 0) {
                        var routeData = data.routes[0];
                        var coordinates = routeData.geometry.coordinates;
                        var routePoints = coordinates.map(coord => [coord[1], coord[0]]);
                        
                        var polyline = L.polyline(routePoints, {
                            color: color,
                            weight: 6,
                            opacity: index === 0 ? 0.9 : 0.6,
                            dashArray: index === 2 ? '5,10' : null
                        }).addTo(map);
                        
                        routePolylines.push(polyline);
                        
                        // Show police stations along this route as green dots
                        showRoutePoliceStations(routePoints);
                        
                        // Calculate safety factors based on actual route and hardcoded police data
                        var safetyFactors = calculateRealSafetyFactors(routePoints, index);
                        
                        var route = {
                            index: index,
                            start: start,
                            end: end,
                            route: routePoints,
                            distance: (routeData.distance / 1000).toFixed(2),
                            duration: Math.floor(routeData.duration / 60),
                            bounds: polyline.getBounds(),
                            color: color,
                            label: label,
                            safetyFactors: safetyFactors
                        };
                        
                        currentRoutes.push(route);
                        
                        if (index === 0) {
                            map.fitBounds(polyline.getBounds().pad(0.1));
                            selectRoute(0);
                        }
                    }
                    routeCompleted();
                })
                .catch(error => {
                    console.error('Routing error for route ' + index + ':', error);
                    // Fallback to direct route with real safety calculation
                    createSimulatedRoute(start, end, index, color, label);
                });
        }

        function createSimulatedRoute(start, end, index, color, label) {
            var routePoints = [];
            var steps = 20;
            
            // Create significantly different routes for each option
            for (var i = 0; i <= steps; i++) {
                var progress = i / steps;
                var t = progress * Math.PI * 2;
                
                // Different curve patterns for each route type
                var curveFactor = 0;
                if (index === 0) {
                    // Safest route - gentle curve through safer areas
                    curveFactor = Math.sin(t) * 0.015;
                } else if (index === 1) {
                    // Balanced route - moderate curve
                    curveFactor = Math.sin(t * 1.5) * 0.025;
                } else {
                    // Fastest route - more direct with sharper curves
                    curveFactor = Math.sin(t * 2) * 0.01;
                }
                
                var lat = start.lat + (end.lat - start.lat) * progress + curveFactor;
                var lng = start.lng + (end.lng - start.lng) * progress + curveFactor * 0.5;
                routePoints.push([lat, lng]);
            }
            
            var polyline = L.polyline(routePoints, {
                color: color,
                weight: 6,
                opacity: index === 0 ? 0.9 : 0.6,
                dashArray: index === 2 ? '5,10' : null
            }).addTo(map);
            
            routePolylines.push(polyline);
            
            // Show police stations along this route as green dots
            showRoutePoliceStations(routePoints);
            
            // Calculate safety factors based on hardcoded police data
            var safetyFactors = calculateRealSafetyFactors(routePoints, index);
            
            var route = {
                index: index,
                start: start,
                end: end,
                route: routePoints,
                distance: calculateDistance(start.lat, start.lng, end.lat, end.lng).toFixed(2),
                duration: Math.floor((calculateDistance(start.lat, start.lng, end.lat, end.lng) / (index === 2 ? 30 : 25)) * 60),
                bounds: polyline.getBounds(),
                color: color,
                label: label,
                safetyFactors: safetyFactors
            };
            
            currentRoutes.push(route);
            
            if (index === 0) {
                map.fitBounds(polyline.getBounds().pad(0.1));
                selectRoute(0);
            }
            
            routeCompleted();
        }

        function calculateRealSafetyFactors(routePoints, index) {
            var nearbyStations = [];
            var maxDistance = 3.0; // 3km radius for more realistic counting
            
            // Calculate police stations near the route using hardcoded data
            if (allPoliceStations && routePoints) {
                allPoliceStations.forEach(station => {
                    var minDistanceToRoute = Number.MAX_VALUE;
                    var closestPointIndex = -1;
                    
                    // Find minimum distance from this station to any point on the route
                    routePoints.forEach((point, pointIndex) => {
                        var distance = calculateDistance(point[0], point[1], station.lat, station.lng);
                        if (distance < minDistanceToRoute) {
                            minDistanceToRoute = distance;
                            closestPointIndex = pointIndex;
                        }
                    });
                    
                    if (minDistanceToRoute <= maxDistance) {
                        nearbyStations.push({
                            name: station.name,
                            distance: minDistanceToRoute.toFixed(2),
                            lat: station.lat,
                            lng: station.lng
                        });
                    }
                });
            }

            // Sort stations by distance
            nearbyStations.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

            var distance = calculateRouteDistance(routePoints);
            
            // Get current time for crowd calculation
            var now = new Date();
            var hour = now.getHours();
            var isNight = hour >= 20 || hour <= 6;
            
            // Realistic safety calculation based on actual route characteristics
            var baseCCTV = Math.floor((distance * 1.5) + (nearbyStations.length * 2));
            
            // Route-type specific adjustments
            var safetyMultipliers = [1.2, 1.0, 0.7];
            
            // Calculate realistic lighting based on area density and police presence
            var baseLighting = Math.min(95, 40 + (nearbyStations.length * 3) + (index === 0 ? 20 : 0));
            if (isNight) baseLighting *= 0.7; // Reduced lighting effectiveness at night
            
            var baseCrowd = Math.min(90, 35 + (nearbyStations.length * 4) + (index === 0 ? 15 : 0));
            if (isNight) baseCrowd *= 0.6; // Reduced crowd at night
            
            // Calculate safety score with realistic factors
            var policeScore = Math.min(3.0, (nearbyStations.length * 0.3));
            var lightingScore = Math.min(3.0, (baseLighting / 100) * 3);
            var crowdScore = Math.min(2.0, (baseCrowd / 100) * 2);
            var cctvScore = Math.min(2.0, (baseCCTV / 20) * 2);
            
            var baseSafetyScore = policeScore + lightingScore + crowdScore + cctvScore;
            var finalSafetyScore = Math.min(10, (baseSafetyScore * safetyMultipliers[index])).toFixed(1);

            // Generate realistic risk factors based on actual route data
            var highRiskAreas = [];
            var safeZones = [];

            // Realistic risk assessment based on actual metrics
            if (nearbyStations.length < 2) {
                highRiskAreas.push('Limited police presence (' + nearbyStations.length + ' stations)');
            }
            if (baseLighting < 60) {
                highRiskAreas.push('Poorly lit areas (' + baseLighting + '% well-lit)');
            }
            if (baseCrowd < 50) {
                highRiskAreas.push('Low crowd visibility (' + baseCrowd + '% populated)');
            }
            if (distance > 10 && nearbyStations.length < 4) {
                highRiskAreas.push('Long stretches with limited surveillance');
            }
            if (isNight) {
                highRiskAreas.push('Night time travel - extra caution advised');
            }

            // Safe zones for good routes
            if (nearbyStations.length >= 3) {
                safeZones.push('Good police coverage (' + nearbyStations.length + ' stations nearby)');
            }
            if (baseLighting >= 75) {
                safeZones.push('Well-lit route (' + baseLighting + '% well-lit)');
            }
            if (baseCrowd >= 70) {
                safeZones.push('Populated areas (' + baseCrowd + '% crowded)');
            }
            if (baseCCTV >= 15) {
                safeZones.push('Good CCTV coverage (' + baseCCTV + ' cameras estimated)');
            }

            return {
                policeStations: nearbyStations.length,
                policeStationsDetailed: nearbyStations,
                cctvCameras: baseCCTV,
                wellLitAreas: baseLighting + '%',
                crowdedAreas: baseCrowd + '%',
                safetyScore: finalSafetyScore + '/10',
                routeLength: distance.toFixed(2) + ' km',
                estimatedTime: Math.floor((distance / (index === 2 ? 35 : 28)) * 60) + ' min',
                highRiskAreas: highRiskAreas,
                safeZones: safeZones,
                detailedMetrics: {
                    policeScore: policeScore.toFixed(1),
                    lightingScore: lightingScore.toFixed(1),
                    crowdScore: crowdScore.toFixed(1),
                    cctvScore: cctvScore.toFixed(1)
                }
            };
        }

        function routeCompleted() {
            routesCompleted++;
            if (routesCompleted >= totalRoutesExpected) {
                hideLoading();
                showRouteControls();
                updateRouteButtons();
                
                // Sort routes by safety score to ensure consistent ordering
                currentRoutes.sort((a, b) => {
                    return parseFloat(b.safetyFactors.safetyScore) - parseFloat(a.safetyFactors.safetyScore);
                });
                
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'ROUTES_READY',
                    routes: currentRoutes
                }));
            }
        }

        function selectRoute(index) {
            selectedRouteIndex = index;
            
            // Update polyline opacities
            routePolylines.forEach((polyline, i) => {
                if (polyline) {
                    polyline.setStyle({
                        opacity: i === index ? 0.9 : 0.3,
                        weight: i === index ? 8 : 4
                    });
                }
            });
            
            // Show police stations for selected route
            if (currentRoutes[index]) {
                showRoutePoliceStations(currentRoutes[index].route);
            }
            
            updateRouteButtons();
            
            // Notify React Native
            if (currentRoutes[index]) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'ROUTE_SELECTED',
                    index: index,
                    route: currentRoutes[index]
                }));
            }
        }

        function updateRouteButtons() {
            var buttonsDiv = document.getElementById('routeButtons');
            if (!buttonsDiv) return;
            
            buttonsDiv.innerHTML = '';
            
            currentRoutes.forEach((route, index) => {
                var buttonContainer = document.createElement('div');
                buttonContainer.className = 'route-button-container';
                
                var routeButton = document.createElement('button');
                routeButton.className = 'route-button';
                routeButton.innerHTML = route.label + ' (' + route.distance + 'km, Score: ' + route.safetyFactors.safetyScore + ')';
                routeButton.style.backgroundColor = route.color;
                routeButton.style.opacity = index === selectedRouteIndex ? '1' : '0.7';
                routeButton.style.fontWeight = index === selectedRouteIndex ? 'bold' : 'normal';
                
                routeButton.onclick = function() {
                    selectRoute(index);
                };
                
                var shieldButton = document.createElement('button');
                shieldButton.className = 'shield-button';
                shieldButton.innerHTML = '🛡️';
                shieldButton.title = 'Show Safety Analysis';
                
                shieldButton.onclick = function() {
                    analyzeSpecificRoute(index);
                };
                
                buttonContainer.appendChild(routeButton);
                buttonContainer.appendChild(shieldButton);
                buttonsDiv.appendChild(buttonContainer);
            });
        }

        function calculateRouteDistance(routePoints) {
            var totalDistance = 0;
            if (!routePoints || routePoints.length < 2) return 0;
            
            for (var i = 1; i < routePoints.length; i++) {
                totalDistance += calculateDistance(
                    routePoints[i-1][0], routePoints[i-1][1],
                    routePoints[i][0], routePoints[i][1]
                );
            }
            return totalDistance;
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

        function analyzeSpecificRoute(index) {
            if (currentRoutes[index]) {
                var selectedRoute = currentRoutes[index];
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'ROUTE_ANALYSIS',
                    routeData: selectedRoute,
                    safetyFactors: selectedRoute.safetyFactors,
                    routeIndex: index
                }));
            }
        }

        // Listen for messages from React Native
        window.addEventListener('message', function(event) {
            try {
                var data = event.data;
                if (data.type === 'FIND_ROUTE') {
                    geocodeLocation(data.start, function(startLocation) {
                        if (!startLocation) {
                            alert('Start location not found. Please try a different name.');
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'ROUTE_ERROR'
                            }));
                            return;
                        }
                        geocodeLocation(data.end, function(endLocation) {
                            if (!endLocation) {
                                alert('End location not found. Please try a different name.');
                                window.ReactNativeWebView.postMessage(JSON.stringify({
                                    type: 'ROUTE_ERROR'
                                }));
                                return;
                            }
                            drawRoutes(startLocation, endLocation);
                        });
                    });
                } else if (data.type === 'TOGGLE_POLICE') {
                    var isVisible = togglePoliceStations();
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'POLICE_TOGGLED',
                        visible: isVisible
                    }));
                } else if (data.type === 'TOGGLE_HEATMAP') {
                    toggleHeatmap();
                } else if (data.type === 'SELECT_ROUTE') {
                    if (currentRoutes[data.index]) {
                        selectRoute(data.index);
                    }
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        });
    </script>
</body>
</html>`;

export default MainScreen;