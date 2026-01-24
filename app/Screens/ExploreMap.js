import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { BASE_URL } from '../../constants/config';

const ExploreMap = () => {
  const insets = useSafeAreaInsets();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [mapType, setMapType] = useState('standard'); // 'standard', 'satellite', or 'hybrid'
  const [showRoute, setShowRoute] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const webViewRef = useRef(null);
  const locationSubscription = useRef(null);

  const categories = [
    { id: 'all', label: 'All', icon: 'apps', color: '#6366F1' },
    { id: 'plantation_event', label: 'Events', icon: 'park', color: '#10B981' },
    { id: 'recycling_center', label: 'Recycle', icon: 'recycling', color: '#06B6D4' },
    { id: 'eco_store', label: 'Stores', icon: 'store', color: '#F59E0B' },
    { id: 'ngo_office', label: 'NGOs', icon: 'volunteer-activism', color: '#8B5CF6' },
    { id: 'community_garden', label: 'Gardens', icon: 'yard', color: '#84CC16' },
  ];

  useEffect(() => {
    getUserLocation();
    fetchLocations();
    
    // Cleanup location tracking on unmount
    return () => {
      stopLocationTracking();
    };
  }, []);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location.coords);
      } else {
        // Default to Kathmandu center
        setUserLocation({ latitude: 27.7172, longitude: 85.3240 });
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setUserLocation({ latitude: 27.7172, longitude: 85.3240 });
    }
  };

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for live tracking');
        return;
      }

      setIsTracking(true);

      // Start watching location with high accuracy
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 50, // Or when moved 50 meters
        },
        (location) => {
          const newCoords = location.coords;
          setUserLocation(newCoords);

          // If route is active, recalculate it
          if (showRoute && selectedLocation) {
            fetchRouteFromLocation(newCoords, selectedLocation);
          }
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
      Alert.alert('Error', 'Failed to start location tracking');
    }
  };

  const stopLocationTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setIsTracking(false);
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch(`${BASE_URL}/eco-locations`);
      const result = await response.json();

      if (result.success) {
        setLocations(result.locations);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      Alert.alert('Error', 'Failed to load eco-locations');
    } finally {
      setLoading(false);
    }
  };

  const filteredLocations = activeFilter === 'all'
    ? locations
    : locations.filter(loc => loc.category === activeFilter);

  const getCategoryColor = (category) => {
    const cat = categories.find(c => c.id === category);
    return cat ? cat.color : '#6366F1';
  };

  const openDirections = (location) => {
    const { latitude, longitude, name } = location;

    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(name)}@${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${encodeURIComponent(name)})`,
    });

    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open maps application');
    });
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    if (distance < 1) {
      return `${Math.round(distance * 1000)} m`;
    }
    return `${distance.toFixed(1)} km`;
  };

  // Generate HTML for Leaflet map
  const generateMapHTML = () => {
    const center = userLocation || { latitude: 27.7172, longitude: 85.3240 };
    const locationsJSON = JSON.stringify(filteredLocations);
    const currentMapType = mapType;
    const routeCoordinates = routeInfo?.coordinates || null;
    const hasRoute = showRoute && routeCoordinates;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { width: 100%; height: 100vh; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          // Nepal boundaries (approximate)
          const nepalBounds = [
            [26.3, 80.0],  // Southwest corner
            [30.5, 88.2]   // Northeast corner
          ];

          const map = L.map('map', {
            center: [${center.latitude}, ${center.longitude}],
            zoom: 12,
            minZoom: 7,    // Prevent zooming out too far
            maxZoom: 18,   // Allow zooming in for details
            maxBounds: nepalBounds,  // Restrict panning to Nepal
            maxBoundsViscosity: 1.0,  // Make bounds "hard" - can't pan outside
            zoomControl: false  // Disable default zoom control
          });

          // Add zoom control to bottom-right
          L.control.zoom({
            position: 'bottomright'
          }).addTo(map);
          
          // Tile layers
          const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
          });

          const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri',
            maxZoom: 19
          });

          const labelsLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png', {
            attribution: '© CartoDB',
            maxZoom: 19,
            pane: 'shadowPane'
          });

          // Add appropriate layer based on map type
          if ('${currentMapType}' === 'satellite') {
            satelliteLayer.addTo(map);
          } else if ('${currentMapType}' === 'hybrid') {
            satelliteLayer.addTo(map);
            labelsLayer.addTo(map);
          } else {
            osmLayer.addTo(map);
          }

          // User location marker
          L.marker([${center.latitude}, ${center.longitude}], {
            icon: L.divIcon({
              className: 'user-marker',
              html: '<div style="background: #6366F1; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
              iconSize: [16, 16]
            })
          }).addTo(map).bindPopup('You are here');

          // Draw route if available
          ${hasRoute ? `
          const routeCoords = ${JSON.stringify(routeCoordinates)};
          const latLngs = routeCoords.map(coord => [coord[1], coord[0]]);
          
          const routeLayer = L.polyline(latLngs, {
            color: '#6366F1',
            weight: 6,
            opacity: 0.8,
            lineJoin: 'round',
            lineCap: 'round'
          }).addTo(map);
          
          // Fit map to show entire route
          map.fitBounds(routeLayer.getBounds(), { padding: [80, 80] });
          ` : ''}

          // Eco-location markers
          const locations = ${locationsJSON};
          const categoryColors = {
            'plantation_event': '#10B981',
            'recycling_center': '#06B6D4',
            'eco_store': '#F59E0B',
            'ngo_office': '#8B5CF6',
            'community_garden': '#84CC16'
          };

          locations.forEach((location, index) => {
            const color = categoryColors[location.category] || '#6366F1';
            
            const marker = L.marker([location.latitude, location.longitude], {
              icon: L.divIcon({
                className: 'custom-marker',
                html: \`<div style="background: \${color}; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 3px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><div style="transform: rotate(45deg); color: white; font-size: 16px;">📍</div></div>\`,
                iconSize: [30, 30],
                iconAnchor: [15, 30]
              })
            }).addTo(map);

            marker.on('click', () => {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'markerClick',
                location: location
              }));
            });
          });
        </script>
      </body>
      </html>
    `;
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerClick') {
        setSelectedLocation(data.location);
        setShowRoute(false);
        setRouteInfo(null);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };

  const fetchRoute = async () => {
    if (!userLocation || !selectedLocation) return;

    try {
      const start = `${userLocation.longitude},${userLocation.latitude}`;
      const end = `${selectedLocation.longitude},${selectedLocation.latitude}`;
      
      // Using OSRM (free, no API key needed)
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`
      );
      const data = await response.json();

      if (data.code === 'Ok' && data.routes.length > 0) {
        const route = data.routes[0];
        const routeCoordinates = route.geometry.coordinates;
        
        setRouteInfo({
          distance: (route.distance / 1000).toFixed(1), // Convert to km
          duration: Math.round(route.duration / 60), // Convert to minutes
          coordinates: routeCoordinates,
        });
        setShowRoute(true);

        // Start live location tracking
        startLocationTracking();
      } else {
        Alert.alert('Route Error', 'Could not find a route to this location');
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      Alert.alert('Error', 'Failed to calculate route');
    }
  };

  const fetchRouteFromLocation = async (fromLocation, toLocation) => {
    try {
      const start = `${fromLocation.longitude},${fromLocation.latitude}`;
      const end = `${toLocation.longitude},${toLocation.latitude}`;
      
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`
      );
      const data = await response.json();

      if (data.code === 'Ok' && data.routes.length > 0) {
        const route = data.routes[0];
        const routeCoordinates = route.geometry.coordinates;
        
        setRouteInfo({
          distance: (route.distance / 1000).toFixed(1),
          duration: Math.round(route.duration / 60),
          coordinates: routeCoordinates,
        });
      }
    } catch (error) {
      console.error('Error updating route:', error);
    }
  };

  const clearRoute = () => {
    setShowRoute(false);
    setRouteInfo(null);
    stopLocationTracking();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading eco-locations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map */}
      <WebView
        ref={webViewRef}
        source={{ html: generateMapHTML() }}
        style={styles.map}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />

      {/* Floating Category Filters */}
      <View style={[styles.filterContainer, { top: insets.top + 8 }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {categories.map(cat => {
            const count = cat.id === 'all'
              ? locations.length
              : locations.filter(loc => loc.category === cat.id).length;

            return (
              <Pressable
                key={cat.id}
                style={[
                  styles.filterChip,
                  activeFilter === cat.id && { backgroundColor: cat.color }
                ]}
                onPress={() => setActiveFilter(cat.id)}
              >
                <MaterialIcons
                  name={cat.icon}
                  size={16}
                  color={activeFilter === cat.id ? '#fff' : '#64748B'}
                />
                <Text
                  style={[
                    styles.filterText,
                    activeFilter === cat.id && styles.filterTextActive
                  ]}
                >
                  {cat.label}
                </Text>
                <View
                  style={[
                    styles.filterBadge,
                    activeFilter === cat.id && styles.filterBadgeActive
                  ]}
                >
                  <Text
                    style={[
                      styles.filterBadgeText,
                      activeFilter === cat.id && styles.filterBadgeTextActive
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Map Type Toggle Button */}
      <Pressable
        style={[styles.mapTypeButton, { top: insets.top + 70 }]}
        onPress={() => {
          if (mapType === 'standard') {
            setMapType('satellite');
          } else if (mapType === 'satellite') {
            setMapType('hybrid');
          } else {
            setMapType('standard');
          }
        }}
      >
        <MaterialIcons
          name={mapType === 'standard' ? 'satellite' : mapType === 'satellite' ? 'layers' : 'map'}
          size={24}
          color="#6366F1"
        />
        <Text style={styles.mapTypeText}>
          {mapType === 'standard' ? 'Satellite' : mapType === 'satellite' ? 'Hybrid' : 'Map'}
        </Text>
      </Pressable>

      {/* Location Details Card */}
      {selectedLocation && (
        <View style={styles.detailsCard}>
          <View style={styles.detailsHeader}>
            <View style={styles.detailsHeaderLeft}>
              <Text style={styles.locationName}>{selectedLocation.name}</Text>
              <View style={styles.categoryBadge}>
                <MaterialIcons
                  name={categories.find(c => c.id === selectedLocation.category)?.icon || 'place'}
                  size={14}
                  color="#fff"
                />
                <Text style={styles.categoryText}>
                  {selectedLocation.category.replace('_', ' ')}
                </Text>
              </View>
            </View>
            <Pressable
              style={styles.closeButton}
              onPress={() => setSelectedLocation(null)}
            >
              <MaterialIcons name="close" size={24} color="#64748B" />
            </Pressable>
          </View>

          <Text style={styles.locationDescription}>
            {selectedLocation.description}
          </Text>

          <View style={styles.locationInfo}>
            <MaterialIcons name="place" size={18} color="#64748B" />
            <Text style={styles.locationAddress}>{selectedLocation.address}</Text>
          </View>

          {userLocation && (
            <View style={styles.locationInfo}>
              <MaterialIcons name="directions" size={18} color="#64748B" />
              <Text style={styles.locationDistance}>
                {calculateDistance(
                  userLocation.latitude,
                  userLocation.longitude,
                  selectedLocation.latitude,
                  selectedLocation.longitude
                )} away
              </Text>
            </View>
          )}

          {showRoute && routeInfo && (
            <View style={styles.routeInfoContainer}>
              <View style={styles.routeInfoItem}>
                <MaterialIcons name="straighten" size={18} color="#6366F1" />
                <Text style={styles.routeInfoText}>{routeInfo.distance} km</Text>
              </View>
              <View style={styles.routeInfoItem}>
                <MaterialIcons name="schedule" size={18} color="#6366F1" />
                <Text style={styles.routeInfoText}>{routeInfo.duration} min</Text>
              </View>
              {isTracking && (
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>Live</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.buttonRow}>
            {!showRoute ? (
              <>
                <Pressable
                  style={[styles.actionButton, styles.routeButton]}
                  onPress={fetchRoute}
                >
                  <MaterialIcons name="directions" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Show Route</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.directionsButton]}
                  onPress={() => openDirections(selectedLocation)}
                >
                  <MaterialIcons name="navigation" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Navigate</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  style={[styles.actionButton, styles.clearButton]}
                  onPress={clearRoute}
                >
                  <MaterialIcons name="close" size={20} color="#64748B" />
                  <Text style={[styles.actionButtonText, { color: '#64748B' }]}>Clear Route</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.directionsButton]}
                  onPress={() => openDirections(selectedLocation)}
                >
                  <MaterialIcons name="navigation" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Navigate</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  filterContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#fff',
  },
  filterBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 18,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  filterBadgeTextActive: {
    color: '#fff',
  },
  map: {
    flex: 1,
  },
  detailsCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailsHeaderLeft: {
    flex: 1,
  },
  locationName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#6366F1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  locationAddress: {
    fontSize: 14,
    color: '#64748B',
    flex: 1,
  },
  locationDistance: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  routeInfoContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    marginVertical: 8,
  },
  routeInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeInfoText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366F1',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  routeButton: {
    backgroundColor: '#10B981',
  },
  clearButton: {
    backgroundColor: '#F1F5F9',
  },
  directionsButton: {
    backgroundColor: '#6366F1',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  mapTypeButton: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  mapTypeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366F1',
  },
});

export default ExploreMap;
