// admin.tsx - Updated with heatmap WebView
import { router } from 'expo-router';
import React, { useRef } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { supabase } from '../../utils/supabase';

const AdminScreen: React.FC = () => {
  const webViewRef = useRef<WebView>(null);

  const adminHtmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
    <script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
    <style>
        body { margin: 0; padding: 0; }
      #map { height: 60vh; width: 100vw; }
      .info-panel {
        position: relative;
        margin: 12px auto;
        background: white;
        padding: 15px;
        border-radius: 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        max-width: 95%;
      }
        .hotspot-marker {
            background: #ff4444;
            border-radius: 50%;
            border: 2px solid white;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <div class="info-panel">
        <h3>🛡️ Admin Heatmap Dashboard</h3>
        <p><strong>Live Crowd Density Monitoring</strong></p>
        <div style="font-size: 12px; color: #666;">
            <div>🔴 Red: High density areas</div>
            <div>🟡 Yellow: Medium density</div>
            <div>🟢 Green: Low density</div>
        </div>
        <hr>
        <p style="font-size: 12px;">
            <strong>Hotspots Identified:</strong><br>
            • MG Road / Brigade Road<br>
            • Commercial Street<br>
            • Whitefield<br>
            • Marathahalli<br>
            • Electronic City
        </p>
    </div>

    <script>
        var map = L.map('map').setView([12.9716, 77.5946], 11);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Real-time crowd density data (simulated)
        function generateRealTimeData() {
            var baseData = [
                // High density areas (commercial centers)
                [12.9758, 77.6055, 0.9], // Brigade Road
                [12.9716, 77.5946, 0.8], // MG Road
                [12.9815, 77.6082, 0.7], // Commercial Street
                [12.9569, 77.7011, 0.8], // Marathahalli
                [12.9698, 77.7499, 0.7], // Whitefield
                
                // Medium density areas (residential + commercial)
                [12.9782, 77.6408, 0.6], // Indiranagar
                [12.9348, 77.6264, 0.7], // Koramangala
                [12.9302, 77.5834, 0.6], // Jayanagar
                [12.9116, 77.6473, 0.5], // HSR Layout
                [12.8456, 77.6651, 0.6], // Electronic City
                
                // Transportation hubs
                [12.9784, 77.5778, 0.7], // Majestic
                [13.0256, 77.5485, 0.5], // Yeshwanthpur
                [12.9592, 77.6974, 0.6], // KR Puram
                
                // Low density areas
                [13.1007, 77.5963, 0.3], // Yelahanka
                [12.9065, 77.4833, 0.3], // Kengeri
                [12.9254, 77.5468, 0.4]  // Banashankari
            ];

            var realTimeData = [];
            
            // Add dynamic variations to simulate real-time changes
            baseData.forEach(function(point) {
                var variation = (Math.random() - 0.5) * 0.1; // ±10% variation
                var intensity = Math.max(0.1, Math.min(1.0, point[2] + variation));
                realTimeData.push([point[0], point[1], intensity]);
                
                // Add surrounding points for more realistic heatmap
                for (var i = 0; i < 3; i++) {
                    var lat = point[0] + (Math.random() - 0.5) * 0.01;
                    var lng = point[1] + (Math.random() - 0.5) * 0.01;
                    var surroundingIntensity = Math.max(0.1, intensity * (0.7 + Math.random() * 0.3));
                    realTimeData.push([lat, lng, surroundingIntensity]);
                }
            });

            return realTimeData;
        }

        // Create persistent heatmap
        var heatmapLayer = L.heatLayer(generateRealTimeData(), {
            radius: 30,
            blur: 20,
            maxZoom: 16,
            gradient: {
                0.2: 'green',    // Low density
                0.5: 'yellow',   // Medium density  
                0.8: 'red'       // High density
            }
        }).addTo(map);

        // Add hotspot markers for critical areas
        var hotspots = [
            {lat: 12.9758, lng: 77.6055, name: "Brigade Road", intensity: "Very High"},
            {lat: 12.9716, lng: 77.5946, name: "MG Road", intensity: "High"},
            {lat: 12.9569, lng: 77.7011, name: "Marathahalli", intensity: "High"},
            {lat: 12.9698, lng: 77.7499, name: "Whitefield", intensity: "High"},
            {lat: 12.9784, lng: 77.5778, name: "Majestic Bus Stand", intensity: "High"}
        ];

        hotspots.forEach(function(hotspot) {
            L.circleMarker([hotspot.lat, hotspot.lng], {
                color: '#ff4444',
                fillColor: '#ff4444',
                fillOpacity: 0.7,
                radius: 8
            }).addTo(map).bindPopup('<b>🔥 ' + hotspot.name + '</b><br>Intensity: ' + hotspot.intensity);
        });

        // Update heatmap every 30 seconds to simulate real-time data
        setInterval(function() {
            var newData = generateRealTimeData();
            heatmapLayer.setLatLngs(newData);
        }, 30000);

        // Add police station markers
        var policeStations = [
            {lat: 12.9768, lng: 77.5953, name: "Cubbon Park PS"},
            {lat: 12.9815, lng: 77.6082, name: "Commercial Street PS"},
            {lat: 12.9784, lng: 77.5778, name: "Ashok Nagar PS"},
            {lat: 12.9789, lng: 77.6214, name: "Ulsoor PS"},
            {lat: 12.9116, lng: 77.6473, name: "HSR Layout PS"},
            {lat: 12.9348, lng: 77.6264, name: "Koramangala PS"},
            {lat: 12.9698, lng: 77.7499, name: "Whitefield PS"}
        ];

        policeStations.forEach(function(station) {
            L.marker([station.lat, station.lng])
                .addTo(map)
                .bindPopup('<b>🚔 ' + station.name + '</b>')
                .openPopup();
        });
    </script>
</body>
</html>`;

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: async () => {
          try {
            await supabase.auth.signOut();
          } catch (err) {
            console.warn('Error signing out (admin):', err);
          }
          router.replace('/login');
        } }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🛡️ Admin Dashboard</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>🚪 Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: adminHtmlContent }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
        />
      </View>

      <ScrollView style={styles.statsContainer}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Live Crowd Analytics</Text>
          <Text style={styles.cardText}>High Density Areas: 5</Text>
          <Text style={styles.cardText}>Medium Density Areas: 8</Text>
          <Text style={styles.cardText}>Police Coverage: 85%</Text>
          <Text style={styles.cardText}>Last Updated: Just now</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚨 Critical Hotspots</Text>
          <Text style={styles.hotspotItem}>• Brigade Road - Very High</Text>
          <Text style={styles.hotspotItem}>• MG Road - High</Text>
          <Text style={styles.hotspotItem}>• Marathahalli - High</Text>
          <Text style={styles.hotspotItem}>• Whitefield - High</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔧 Admin Actions</Text>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Generate Safety Report</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Update Police Deployment</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Export Heatmap Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#dc3545',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  logoutButton: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  mapContainer: {
    flex: 2,
    borderBottomWidth: 2,
    borderBottomColor: '#ddd',
  },
  webview: {
    flex: 1,
  },
  statsContainer: {
    flex: 1,
    padding: 15,
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  cardText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  hotspotItem: {
    fontSize: 14,
    color: '#dc3545',
    marginBottom: 5,
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default AdminScreen;