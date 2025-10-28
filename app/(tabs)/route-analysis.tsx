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
  routeLength: string;
  estimatedTime: string;
  highRiskAreas: string[];
  safeZones: string[];
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

const RouteAnalysisScreen: React.FC = () => {
  const params = useLocalSearchParams();
  
  // Parse the route data from params
  const safetyFactors: SafetyFactors = JSON.parse(params.safetyFactors as string || '{}');
  const routeData: RouteData = JSON.parse(params.routeData as string || '{}');

  const getScoreColor = (score: string): string => {
    const numericScore = parseFloat(score);
    if (numericScore >= 8) return '#28A745';
    if (numericScore >= 7) return '#FFC107';
    if (numericScore >= 6) return '#FF9800';
    return '#DC3545';
  };

  const getScoreDescription = (score: string): string => {
    const numericScore = parseFloat(score);
    if (numericScore >= 8) return 'Very Safe';
    if (numericScore >= 7) return 'Safe';
    if (numericScore >= 6) return 'Moderately Safe';
    return 'Needs Caution';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Route Safety Analysis</Text>
        <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(safetyFactors.safetyScore) }]}>
          <Text style={styles.scoreText}>{safetyFactors.safetyScore}</Text>
        </View>
      </View>

      <View style={styles.scoreDescription}>
        <Text style={[styles.descriptionText, { color: getScoreColor(safetyFactors.safetyScore) }]}>
          {getScoreDescription(safetyFactors.safetyScore)}
        </Text>
      </View>

      <View style={styles.routeInfo}>
        <Text style={styles.routeText}>
          📍 From: <Text style={styles.highlight}>{routeData.start.name}</Text>
        </Text>
        <Text style={styles.routeText}>
          🎯 To: <Text style={styles.highlight}>{routeData.end.name}</Text>
        </Text>
        <View style={styles.routeDetails}>
          <Text style={styles.detailItem}>📏 {safetyFactors.routeLength}</Text>
          <Text style={styles.detailItem}>⏱ {safetyFactors.estimatedTime}</Text>
        </View>
      </View>

      {/* Safety Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Safety Metrics</Text>
        
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricIcon}>🚔</Text>
            <Text style={styles.metricValue}>{safetyFactors.policeStations}</Text>
            <Text style={styles.metricLabel}>Police Stations</Text>
          </View>
          
          <View style={styles.metricItem}>
            <Text style={styles.metricIcon}>📹</Text>
            <Text style={styles.metricValue}>{safetyFactors.cctvCameras}</Text>
            <Text style={styles.metricLabel}>CCTV Cameras</Text>
          </View>
          
          <View style={styles.metricItem}>
            <Text style={styles.metricIcon}>💡</Text>
            <Text style={styles.metricValue}>{safetyFactors.wellLitAreas}</Text>
            <Text style={styles.metricLabel}>Well Lit</Text>
          </View>
          
          <View style={styles.metricItem}>
            <Text style={styles.metricIcon}>👥</Text>
            <Text style={styles.metricValue}>{safetyFactors.crowdedAreas}</Text>
            <Text style={styles.metricLabel}>Crowded Areas</Text>
          </View>
        </View>
      </View>

      {/* Risk Analysis */}
      {safetyFactors.highRiskAreas && safetyFactors.highRiskAreas.length > 0 && (
        <View style={[styles.section, styles.riskSection]}>
          <Text style={styles.sectionTitle}>⚠️ Areas Needing Attention</Text>
          {safetyFactors.highRiskAreas.map((risk, index) => (
            <View key={index} style={styles.riskItem}>
              <Text style={styles.riskText}>• {risk}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Safe Zones */}
      {safetyFactors.safeZones && safetyFactors.safeZones.length > 0 && (
        <View style={[styles.section, styles.safeSection]}>
          <Text style={styles.sectionTitle}>✅ Safe Zones</Text>
          {safetyFactors.safeZones.map((zone, index) => (
            <View key={index} style={styles.safeItem}>
              <Text style={styles.safeText}>• {zone}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Safety Tips */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🛡️ Safety Recommendations</Text>
        <View style={styles.tipItem}>
          <Text style={styles.tipText}>• Share your live location with trusted contacts</Text>
        </View>
        <View style={styles.tipItem}>
          <Text style={styles.tipText}>• Keep emergency numbers handy</Text>
        </View>
        <View style={styles.tipItem}>
          <Text style={styles.tipText}>• Avoid poorly lit areas after dark</Text>
        </View>
        <View style={styles.tipItem}>
          <Text style={styles.tipText}>• Stay aware of your surroundings</Text>
        </View>
        {parseFloat(safetyFactors.safetyScore) < 7 && (
          <View style={styles.tipItem}>
            <Text style={styles.tipText}>• Consider alternative transportation during late hours</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
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
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  scoreBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  scoreText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  scoreDescription: {
    marginBottom: 20,
  },
  descriptionText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  routeInfo: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
  },
  highlight: {
    fontWeight: 'bold',
    color: '#333',
  },
  routeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailItem: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  },
  metricItem: {
    alignItems: 'center',
    width: '48%',
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
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
  },
  riskSection: {
    borderLeftWidth: 4,
    borderLeftColor: '#DC3545',
  },
  safeSection: {
    borderLeftWidth: 4,
    borderLeftColor: '#28A745',
  },
  riskItem: {
    marginBottom: 8,
  },
  riskText: {
    color: '#DC3545',
    fontSize: 14,
  },
  safeItem: {
    marginBottom: 8,
  },
  safeText: {
    color: '#28A745',
    fontSize: 14,
  },
  tipItem: {
    marginBottom: 10,
  },
  tipText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default RouteAnalysisScreen;