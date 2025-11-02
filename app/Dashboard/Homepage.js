import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Animatable from 'react-native-animatable';
import { BASE_URL } from '../config';
import { LinearGradient } from 'expo-linear-gradient';

const Homepage = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todaySteps, setTodaySteps] = useState(2847);
  const [carbonSaved, setCarbonSaved] = useState(0);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const mobile = params.mobile || await AsyncStorage.getItem('mobile');
      
      if (!mobile) {
        router.push('/Screens/Login');
        return;
      }

      const response = await fetch(`${BASE_URL}/user/${mobile}`);
      const result = await response.json();

      if (response.ok && result.success) {
        setUserData(result.user);
        setCarbonSaved(result.user.carbonFootprint || 0);
      } else {
        Alert.alert('Error', 'Failed to load user data');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserData();
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('mobile');
            router.push('/Screens/Login');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading your journey...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={['#10B981', '#059669']}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.userName}>
                {userData?.firstName} {userData?.lastName}
              </Text>
            </View>
            <Pressable onPress={handleLogout} style={styles.logoutButton}>
              <MaterialIcons name="logout" size={24} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.headerStats}>
            <Animatable.View animation="fadeInLeft" delay={200} style={styles.statCard}>
              <MaterialIcons name="directions-walk" size={32} color="#fff" />
              <Text style={styles.statNumber}>{todaySteps.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Steps Today</Text>
            </Animatable.View>

            <Animatable.View animation="fadeInRight" delay={400} style={styles.statCard}>
              <MaterialIcons name="eco" size={32} color="#fff" />
              <Text style={styles.statNumber}>{carbonSaved.toFixed(2)} kg</Text>
              <Text style={styles.statLabel}>CO₂ Saved</Text>
            </Animatable.View>
          </View>
        </LinearGradient>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Daily Goal Card */}
          <Animatable.View animation="fadeInUp" delay={600} style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <View style={styles.goalTitleContainer}>
                <MaterialIcons name="flag" size={24} color="#10B981" />
                <Text style={styles.goalTitle}>Daily Goal</Text>
              </View>
              <Text style={styles.goalPercentage}>57%</Text>
            </View>
            
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: '57%' }]} />
            </View>
            
            <View style={styles.goalDetails}>
              <Text style={styles.goalText}>
                <Text style={styles.goalHighlight}>{todaySteps.toLocaleString()}</Text> / 5,000 steps
              </Text>
              <Text style={styles.goalSubtext}>Keep going! You're doing great!</Text>
            </View>
          </Animatable.View>

          {/* Impact Stats */}
          <Animatable.View animation="fadeInUp" delay={800}>
            <Text style={styles.sectionTitle}>Your Impact</Text>
            
            <View style={styles.impactGrid}>
              <View style={styles.impactCard}>
                <View style={[styles.impactIconContainer, { backgroundColor: '#DBEAFE' }]}>
                  <MaterialIcons name="terrain" size={28} color="#3B82F6" />
                </View>
                <Text style={styles.impactNumber}>12.4 km</Text>
                <Text style={styles.impactLabel}>Distance Walked</Text>
              </View>

              <View style={styles.impactCard}>
                <View style={[styles.impactIconContainer, { backgroundColor: '#FEF3C7' }]}>
                  <MaterialIcons name="local-fire-department" size={28} color="#F59E0B" />
                </View>
                <Text style={styles.impactNumber}>248</Text>
                <Text style={styles.impactLabel}>Calories Burned</Text>
              </View>

              <View style={styles.impactCard}>
                <View style={[styles.impactIconContainer, { backgroundColor: '#DCFCE7' }]}>
                  <MaterialIcons name="forest" size={28} color="#10B981" />
                </View>
                <Text style={styles.impactNumber}>0.8</Text>
                <Text style={styles.impactLabel}>Trees Equivalent</Text>
              </View>

              <View style={styles.impactCard}>
                <View style={[styles.impactIconContainer, { backgroundColor: '#E0E7FF' }]}>
                  <MaterialIcons name="timer" size={28} color="#6366F1" />
                </View>
                <Text style={styles.impactNumber}>42 min</Text>
                <Text style={styles.impactLabel}>Active Time</Text>
              </View>
            </View>
          </Animatable.View>

          {/* Quick Actions */}
          <Animatable.View animation="fadeInUp" delay={1000}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            
            <View style={styles.actionGrid}>
              <Pressable style={styles.actionCard}>
                <View style={[styles.actionIcon, { backgroundColor: '#ECFDF5' }]}>
                  <MaterialIcons name="add-circle" size={32} color="#10B981" />
                </View>
                <Text style={styles.actionText}>Log Activity</Text>
              </Pressable>

              <Pressable style={styles.actionCard}>
                <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
                  <MaterialIcons name="leaderboard" size={32} color="#F59E0B" />
                </View>
                <Text style={styles.actionText}>Leaderboard</Text>
              </Pressable>

              <Pressable style={styles.actionCard}>
                <View style={[styles.actionIcon, { backgroundColor: '#DBEAFE' }]}>
                  <MaterialIcons name="emoji-events" size={32} color="#3B82F6" />
                </View>
                <Text style={styles.actionText}>Challenges</Text>
              </Pressable>

              <Pressable style={styles.actionCard}>
                <View style={[styles.actionIcon, { backgroundColor: '#E0E7FF' }]}>
                  <MaterialIcons name="insights" size={32} color="#6366F1" />
                </View>
                <Text style={styles.actionText}>Insights</Text>
              </Pressable>
            </View>
          </Animatable.View>

          {/* Eco Tips */}
          <Animatable.View animation="fadeInUp" delay={1200} style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <MaterialIcons name="lightbulb" size={24} color="#F59E0B" />
              <Text style={styles.tipTitle}>Eco Tip of the Day</Text>
            </View>
            <Text style={styles.tipText}>
              Walking 10,000 steps a day can save approximately 0.5 kg of CO₂ compared to driving. Keep up the great work!
            </Text>
          </Animatable.View>

          {/* Weekly Progress */}
          <Animatable.View animation="fadeInUp" delay={1400}>
            <Text style={styles.sectionTitle}>This Week</Text>
            
            <View style={styles.weekCard}>
              <View style={styles.weekDays}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                  <View key={index} style={styles.dayContainer}>
                    <View style={styles.dayBarContainer}>
                      <View
                        style={[
                          styles.dayBar,
                          {
                            height: `${[80, 65, 90, 75, 100, 45, 30][index]}%`,
                            backgroundColor: index === 6 ? '#10B981' : '#D1FAE5',
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.dayLabel, index === 6 && styles.dayLabelActive]}>
                      {day}
                    </Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.weekStats}>
                <View style={styles.weekStatItem}>
                  <MaterialIcons name="trending-up" size={20} color="#10B981" />
                  <Text style={styles.weekStatText}>
                    <Text style={styles.weekStatNumber}>+15%</Text> vs last week
                  </Text>
                </View>
              </View>
            </View>
          </Animatable.View>

          {/* Achievements Preview */}
          <Animatable.View animation="fadeInUp" delay={1600}>
            <View style={styles.achievementHeader}>
              <Text style={styles.sectionTitle}>Recent Achievements</Text>
              <Pressable>
                <Text style={styles.viewAllText}>View All</Text>
              </Pressable>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementScroll}>
              <View style={styles.achievementCard}>
                <View style={styles.achievementBadge}>
                  <MaterialIcons name="emoji-events" size={40} color="#F59E0B" />
                </View>
                <Text style={styles.achievementName}>First Steps</Text>
                <Text style={styles.achievementDesc}>Logged your first walk</Text>
              </View>

              <View style={styles.achievementCard}>
                <View style={styles.achievementBadge}>
                  <MaterialIcons name="local-fire-department" size={40} color="#EF4444" />
                </View>
                <Text style={styles.achievementName}>7-Day Streak</Text>
                <Text style={styles.achievementDesc}>Active for 7 days</Text>
              </View>

              <View style={styles.achievementCard}>
                <View style={styles.achievementBadge}>
                  <MaterialIcons name="eco" size={40} color="#10B981" />
                </View>
                <Text style={styles.achievementName}>Eco Warrior</Text>
                <Text style={styles.achievementDesc}>Saved 1kg CO₂</Text>
              </View>
            </ScrollView>
          </Animatable.View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <Pressable style={styles.navItem}>
          <MaterialIcons name="home" size={28} color="#10B981" />
          <Text style={[styles.navText, styles.navTextActive]}>Home</Text>
        </Pressable>

        <Pressable style={styles.navItem}>
          <MaterialIcons name="analytics" size={28} color="#9CA3AF" />
          <Text style={styles.navText}>Stats</Text>
        </Pressable>

        <Pressable style={styles.navItem}>
          <MaterialIcons name="group" size={28} color="#9CA3AF" />
          <Text style={styles.navText}>Community</Text>
        </Pressable>

        <Pressable style={styles.navItem}>
          <MaterialIcons name="person" size={28} color="#9CA3AF" />
          <Text style={styles.navText}>Profile</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  goalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  goalPercentage: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  goalDetails: {
    gap: 4,
  },
  goalText: {
    fontSize: 16,
    color: '#6B7280',
  },
  goalHighlight: {
    fontWeight: '700',
    color: '#111827',
  },
  goalSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  impactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  impactCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  impactIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  impactNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  impactLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  tipCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  tipText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
  },
  weekCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dayContainer: {
    alignItems: 'center',
    gap: 8,
  },
  dayBarContainer: {
    height: 100,
    width: 32,
    justifyContent: 'flex-end',
  },
  dayBar: {
    width: '100%',
    borderRadius: 4,
  },
  dayLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  dayLabelActive: {
    color: '#10B981',
  },
  weekStats: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  weekStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weekStatText: {
    fontSize: 14,
    color: '#6B7280',
  },
  weekStatNumber: {
    fontWeight: '700',
    color: '#10B981',
  },
  achievementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  achievementScroll: {
    marginBottom: 24,
  },
  achievementCard: {
    width: 140,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  achievementBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  achievementDesc: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  navText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  navTextActive: {
    color: '#10B981',
  },
});

export default Homepage;