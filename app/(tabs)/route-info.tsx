import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface SafetyFactors {
  policeStations: number;
  cctvCameras: number;
  wellLitAreas: string;
  crowdedAreas: string;
  safetyScore: string;
}

interface RoutePoint {
  name: string;
  lat: number;
  lng: number;
}

interface RouteData {
  start: RoutePoint;
  end: RoutePoint;
  route: [number, number][];
  safetyFactors: SafetyFactors;
}

interface SafetyFactorItemProps {
  title: string;
  value: string;
  description: string;
}

const SafetyFactorItem: React.FC<SafetyFactorItemProps> = ({ title, value, description }) => (
  <View style={styles.safetyItem}>
    <Text style={styles.safetyTitle}>{title}</Text>
    <Text style={styles.safetyValue}>{value}</Text>
    <Text style={styles.safetyDescription}>{description}</Text>
  </View>
);

const RouteInfoScreen: React.FC = () => {
  const params = useLocalSearchParams();
  
  // Parse the route data from params
  const safetyFactors: SafetyFactors = JSON.parse(params.safetyFactors as string || '{}');
  const routeData: RouteData = JSON.parse(params.routeData as string || '{}');

  const getScoreColor = (score: string): string => {
    const numericScore = parseFloat(score);
    if (numericScore >= 8) return '#28A745';
    if (numericScore >= 6) return '#FFC107';
    return '#DC3545';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Route Safety Analysis</Text>
        <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(safetyFactors.safetyScore) }]}>
          <Text style={styles.scoreText}>{safetyFactors.safetyScore}</Text>
        </View>
      </View>

      <View style={styles.routeInfo}>
        <Text style={styles.routeText}>
          📍 From: <Text style={styles.highlight}>{routeData.start.name}</Text>
        </Text>
        <Text style={styles.routeText}>
          🎯 To: <Text style={styles.highlight}>{routeData.end.name}</Text>
        </Text>
      </View>

      <View style={styles.safetyFactors}>
        <Text style={styles.sectionTitle}>Safety Factors</Text>
        
        <SafetyFactorItem
          title="🚔 Police Stations Nearby"
          value={safetyFactors.policeStations + " stations"}
          description="Police stations within 1km of your route"
        />
        
        <SafetyFactorItem
          title="📹 CCTV Coverage"
          value={safetyFactors.cctvCameras + " cameras"}
          description="Security cameras monitoring the route"
        />
        
        <SafetyFactorItem
          title="💡 Street Lighting"
          value={safetyFactors.wellLitAreas}
          description="Percentage of well-lit areas along the route"
        />
        
        <SafetyFactorItem
          title="👥 Crowd Presence"
          value={safetyFactors.crowdedAreas}
          description="Areas with good foot traffic and visibility"
        />
      </View>

      <View style={styles.safetyTips}>
        <Text style={styles.sectionTitle}>Safety Tips</Text>
        <Text style={styles.tip}>• Stay in well-lit areas</Text>
        <Text style={styles.tip}>• Keep emergency contacts handy</Text>
        <Text style={styles.tip}>• Share your live location with trusted contacts</Text>
        <Text style={styles.tip}>• Avoid isolated shortcuts</Text>
        <Text style={styles.tip}>• Trust your instincts - if something feels wrong, change your path</Text>
      </View>

      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>Back to Map</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  scoreBadge: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scoreText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  routeInfo: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  routeText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#555',
  },
  highlight: {
    fontWeight: 'bold',
    color: '#333',
  },
  safetyFactors: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  safetyItem: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  safetyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  safetyValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  safetyDescription: {
    fontSize: 14,
    color: '#666',
  },
  safetyTips: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  tip: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default RouteInfoScreen;