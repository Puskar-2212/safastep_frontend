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

          // Icon SVGs - Using custom downloaded icons
          const categoryIcons = {
            'plantation_event': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M22.4,22l-4.134-6h2.819L16.8,10h3.155l-5.9-8.929a2.516,2.516,0,0,0-4.117.02L5.366,8H12l1.429,2H6.858L4,14h9.576l1.379,2H5.731L1.6,22H11v2h2V22Z"/></svg>',
            'recycling_center': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="m7.757,22.672c-.288.441-.768.682-1.259.682-.28,0-.564-.078-.817-.243-1.435-.934-2.34-2.447-2.482-4.153l-1.08-12.957h-.62c-.829,0-1.5-.672-1.5-1.5s.671-1.5,1.5-1.5h4.776c.621-1.742,2.271-3,4.224-3h3c1.953,0,3.602,1.258,4.224,3h4.776c.829,0,1.5.672,1.5,1.5s-.671,1.5-1.5,1.5h-.62l-.219,2.625c-.065.783-.662,1.452-1.619,1.37-.826-.069-1.439-.794-1.37-1.62l.198-2.375H5.13l1.059,12.707c.065.776.477,1.465,1.129,1.89.694.451.891,1.381.439,2.075Zm6.743-1.672h-1.387c-.024,0-.065,0-.096-.057-.032-.057-.01-.092.002-.111l.644-1.045c.435-.705.215-1.629-.49-2.064-.707-.433-1.63-.216-2.064.49l-.645,1.046c-.59.959-.616,2.165-.067,3.148.549.982,1.589,1.593,2.715,1.593h1.387c.829,0,1.5-.672,1.5-1.5s-.671-1.5-1.5-1.5Zm8.372-2.798c-.44-.7-1.366-.913-2.068-.473-.702.44-.913,1.367-.472,2.068l.648,1.033c.014.021.035.055.003.112-.032.057-.071.057-.097.057h-1.387c-.829,0-1.5.672-1.5,1.5s.671,1.5,1.5,1.5h1.387c1.131,0,2.174-.615,2.722-1.605.548-.99.514-2.201-.088-3.159l-.649-1.033Zm-2.984-1.932c.702-.441.913-1.367.472-2.068l-.763-1.215c-.575-.917-1.553-1.443-2.646-1.457-1.082.004-2.067.557-2.636,1.479l-.742,1.204c-.434.706-.215,1.63.491,2.064.245.151.517.223.785.223.503,0,.995-.253,1.279-.713l.741-1.204c.011-.019.033-.053.094-.053.062.007.082.033.094.052l.764,1.216c.44.702,1.366.912,2.068.473Z"/></svg>',
            'eco_store': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="m22.535,1.465h0c-.944-.944-2.2-1.465-3.535-1.465s-2.591.521-3.535,1.464c-.944.944-1.465,2.2-1.465,3.536s.521,2.592,1.504,3.573l1.971,1.831c.43.399.979.599,1.53.599s1.105-.201,1.536-.604l1.994-1.863c.944-.944,1.465-2.2,1.465-3.536s-.521-2.591-1.465-3.535Zm-2.085,4.914l-1.447,1.352-1.417-1.317c-.378-.377-.586-.879-.586-1.413s.208-1.036.586-1.414.88-.586,1.414-.586,1.036.208,1.414.586h0c.378.378.586.88.586,1.414s-.208,1.036-.55,1.379Zm-1.273,6.288c-.505-.256-1.11-.205-1.566.131-.171.127-.438.208-.682.208h-.857c-.591,0-1.071-.48-1.071-1.071v-.429c0-.828-.672-1.5-1.5-1.5s-1.5.672-1.5,1.5v.429c0,.591-.48,1.071-1.071,1.071h-.857c-.591,0-1.071-.48-1.071-1.071v-.429c0-.828-.671-1.5-1.5-1.5s-1.5.672-1.5,1.5v.429c0,.591-.48,1.071-1.071,1.071h-.857c-.938,0-1.04-.712-1.065-.958l.919-4.747c.27-.777.993-1.295,1.822-1.295h.253v.5c0,.828.671,1.5,1.5,1.5s1.5-.672,1.5-1.5v-.5h1.5c.829,0,1.5-.672,1.5-1.5s-.671-1.5-1.5-1.5h-4.753c-2.178,0-4.071,1.398-4.71,3.479C1.02,6.536,0,11.839,0,11.935,0,12.948.385,13.864,1,14.577v4.928c0,2.481,2.019,4.5,4.5,4.5h10c2.481,0,4.5-2.019,4.5-4.5v-5.5c0-.565-.318-1.084-.823-1.339Zm-2.177,6.839c0,.827-.673,1.5-1.5,1.5H5.5c-.827,0-1.5-.673-1.5-1.5v-3.507c.024,0,.929.007.929.007.98,0,1.868-.362,2.571-.941.703.579,1.591.941,2.571.941h.857c.98,0,1.868-.362,2.571-.941.703.579,1.591.941,2.571.941,0,0,.905,0,.929,0v3.501Z"/></svg>',
            'ngo_office': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="m14,10h2v14H0V3C0,1.346,1.346,0,3,0h2v2h-2c-.551,0-1,.448-1,1v19h12v-12Zm-7,0h-3v2h3v-2Zm5,0h-3v2h3v-2Zm-5,4h-3v2h3v-2Zm5,0h-3v2h3v-2Zm-8,6h3v-2h-3v2Zm5,0h3v-2h-3v2ZM21.5,1.6c.496,0,.9.404.9.9v3c0,.496-.404.9-.9.9s-.9-.404-.9-.9v-3c0-.496.404-.9.9-.9m0-1.6c-1.381,0-2.5,1.119-2.5,2.5v3c0,1.381,1.119,2.5,2.5,2.5s2.5-1.119,2.5-2.5v-3c0-1.381-1.119-2.5-2.5-2.5h0Zm-6,3.5v1.5h.9v.5c0,.496-.404.9-.9.9s-.9-.404-.9-.9v-3c0-.496.404-.9.9-.9.307,0,.565.164.728.4h1.722c-.232-1.141-1.24-2-2.45-2-1.381,0-2.5,1.119-2.5,2.5v3c0,1.381,1.119,2.5,2.5,2.5s2.5-1.119,2.5-2.5v-2h-2.5ZM10.4,0v4.063L8.6.009v-.009h-1.6v8h1.6V3.946l1.8,4.054h1.6V0h-1.6Z"/></svg>',
            'community_garden': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="m23.999 18.904c-.028.684-.199 1.63-.848 2.3-.616.636-1.483.803-2.151.829v.967c0 .553-.448 1-1 1s-1-.447-1-1v-1.008c-.657-.024-1.523-.189-2.163-.829-.677-.677-.828-1.617-.837-2.284-.006-.485.394-.885.879-.879.667.008 1.607.16 2.284.837.49.49.753 1.101.837 1.663.109-.554.431-1.143.897-1.624.648-.669 1.566-.846 2.228-.875.487-.021.896.4.875.903zm-.926-8.904c-.351 0-.672.198-.829.512l-.744 1.488h-5.195l1.108-1.584c.89-1.237.763-2.923-.303-4.008-.062-.065-3.866-3.426-3.929-3.485-.643-.654-1.509-.951-2.362-.897-.444-.418-.885-.822-1.052-.937-2.054-1.422-4.832-1.456-6.911-.085-1.89 1.246-2.955 3.321-2.85 5.504 0 3.302.367 5.713 2.196 7.524.041.044 4.148 3.712 4.193 3.754.842.861 2.018 1.302 3.203 1.21 1.197-.091 2.289-.707 3.004-1.701l2.304-3.295h6.594l.744 1.488c.157.314.478.512.829.512.512 0 .927-.415.927-.927v-4.146c0-.512-.415-.927-.927-.927zm-21.005-1.672c-.039-.559-.062-1.167-.063-1.867-.072-1.518.658-2.934 1.952-3.787 1.406-.926 3.285-.902 4.673.059.073.051.131.114.201.169-.627.497-4.87 3.811-6.285 4.95-.177.142-.329.309-.478.477zm13.715.931-4.811 6.879c-.362.503-.918.818-1.525.864-.595.047-1.194-.178-1.67-.661l-4.157-3.719c-.427-.435-.651-1.039-.615-1.655.036-.621.319-1.174.796-1.557 1.407-1.133 5.879-4.625 6.569-5.175.184-.146.403-.221.627-.221.282 0 .572.118.809.357l3.899 3.458c.357.384.396.988.079 1.429z"/></svg>'
          };

          locations.forEach((location, index) => {
            const color = categoryColors[location.category] || '#6366F1';
            const icon = categoryIcons[location.category] || categoryIcons['plantation_event'];
            
            const marker = L.marker([location.latitude, location.longitude], {
              icon: L.divIcon({
                className: 'custom-marker',
                html: \`<div style="width: 40px; height: 40px; background: \${color}; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
                  \${icon}
                </div>\`,
                iconSize: [40, 40],
                iconAnchor: [20, 20],
                popupAnchor: [0, -20]
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
