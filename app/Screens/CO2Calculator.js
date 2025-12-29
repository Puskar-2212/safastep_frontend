import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Animatable from "react-native-animatable";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../config";

const CO2Calculator = ({ onQuizStateChange }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [totalCO2, setTotalCO2] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [currentComparison, setCurrentComparison] = useState("");
  const [celebrateGoodChoice, setCelebrateGoodChoice] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Notify parent about quiz state
  useEffect(() => {
    if (onQuizStateChange) {
      onQuizStateChange(showResults);
    }
  }, [showResults]);

  // All available questions - we'll randomly select from these
  const allQuestions = [
    // Transportation questions
    {
      id: "transport_mode",
      category: "Transportation",
      icon: "directions-car",
      color: "#3B82F6",
      question: "How do you usually commute?",
      funFact: "Transportation accounts for 24% of global CO₂ emissions!",
      options: [
        { 
          label: "Car (alone)", 
          value: "car_alone", 
          co2: 0.21,
          comparison: "Like charging 420 smartphones daily",
          isGood: false
        },
        { 
          label: "Car (carpooling)", 
          value: "car_pool", 
          co2: 0.11,
          comparison: "50% less than driving alone!",
          isGood: true
        },
        { 
          label: "Bus", 
          value: "bus", 
          co2: 0.089,
          comparison: "Like planting 2 trees per month",
          isGood: true
        },
        { 
          label: "Train/Metro", 
          value: "train", 
          co2: 0.041,
          comparison: "80% cleaner than driving!",
          isGood: true
        },
        { 
          label: "Bike/Walk", 
          value: "bike", 
          co2: 0,
          comparison: "Zero emissions! You're a hero! 🌟",
          isGood: true
        },
      ],
      followUp: "transport_distance",
    },
    {
      id: "transport_distance",
      category: "Transportation",
      icon: "straighten",
      color: "#3B82F6",
      question: "How far do you travel daily?",
      funFact: "Every km you don't drive saves 0.2 kg of CO₂!",
      options: [
        { label: "Less than 5 km", value: "5", multiplier: 5, comparison: "Short commute!" },
        { label: "5-10 km", value: "10", multiplier: 10, comparison: "Average distance" },
        { label: "10-20 km", value: "20", multiplier: 20, comparison: "Consider carpooling!" },
        { label: "20-50 km", value: "50", multiplier: 50, comparison: "Long commute" },
        { label: "More than 50 km", value: "100", multiplier: 100, comparison: "Very long distance" },
      ],
      dependsOn: "transport_mode",
    },
    {
      id: "flight_frequency",
      category: "Transportation",
      icon: "flight",
      color: "#3B82F6",
      question: "How often do you fly?",
      funFact: "One round-trip flight = 1-2 tons of CO₂!",
      options: [
        { label: "Never", value: "never", co2: 0, comparison: "Great choice! ✈️❌", isGood: true },
        { label: "Once a year", value: "yearly", co2: 0.3, comparison: "~1 ton CO₂/year" },
        { label: "2-3 times/year", value: "occasional", co2: 0.8, comparison: "~3 tons CO₂/year" },
        { label: "Monthly", value: "frequent", co2: 3, comparison: "~12 tons CO₂/year", isGood: false },
      ],
    },
    // Energy questions
    {
      id: "energy_source",
      category: "Energy",
      icon: "bolt",
      color: "#F59E0B",
      question: "What's your home energy source?",
      funFact: "Renewable energy can cut your carbon footprint by 90%!",
      options: [
        { label: "Coal-based", value: "coal", co2: 0.95, comparison: "Highest emissions", isGood: false },
        { label: "Natural gas", value: "gas", co2: 0.45, comparison: "50% less than coal" },
        { label: "Mixed grid", value: "mixed", co2: 0.5, comparison: "Average emissions" },
        { label: "Renewable", value: "renewable", co2: 0.05, comparison: "90% cleaner! 🌱", isGood: true },
        { label: "Solar panels", value: "solar", co2: 0, comparison: "Zero emissions! ☀️", isGood: true },
      ],
      followUp: "energy_usage",
    },
    {
      id: "energy_usage",
      category: "Energy",
      icon: "power",
      color: "#F59E0B",
      question: "Daily electricity usage?",
      funFact: "LED bulbs use 75% less energy than traditional bulbs!",
      options: [
        { label: "Low (< 10 kWh)", value: "10", multiplier: 10, comparison: "Efficient home!", isGood: true },
        { label: "Medium (10-20 kWh)", value: "20", multiplier: 20, comparison: "Average usage" },
        { label: "High (20-40 kWh)", value: "40", multiplier: 40, comparison: "Consider saving energy" },
        { label: "Very High (> 40 kWh)", value: "60", multiplier: 60, comparison: "High consumption", isGood: false },
      ],
      dependsOn: "energy_source",
    },
    {
      id: "heating_cooling",
      category: "Energy",
      icon: "thermostat",
      color: "#F59E0B",
      question: "How do you heat/cool your home?",
      funFact: "Heating & cooling = 50% of home energy use!",
      options: [
        { label: "Electric heater/AC", value: "electric", co2: 2.5, comparison: "High energy use" },
        { label: "Gas heating", value: "gas", co2: 1.8, comparison: "Moderate emissions" },
        { label: "Heat pump", value: "heat_pump", co2: 0.8, comparison: "70% more efficient!", isGood: true },
        { label: "Minimal use", value: "minimal", co2: 0.3, comparison: "Great conservation! 🌡️", isGood: true },
      ],
    },
    // Food questions
    {
      id: "diet_type",
      category: "Food",
      icon: "restaurant",
      color: "#10B981",
      question: "What's your diet like?",
      funFact: "Beef production creates 10x more emissions than chicken!",
      options: [
        { label: "Heavy meat eater", value: "heavy_meat", co2: 7.2, comparison: "Highest food impact", isGood: false },
        { label: "Moderate meat", value: "moderate_meat", co2: 5.6, comparison: "Average diet" },
        { label: "Low meat", value: "low_meat", co2: 4.7, comparison: "Better choice!" },
        { label: "Vegetarian", value: "vegetarian", co2: 3.8, comparison: "50% less than meat! 🥗", isGood: true },
        { label: "Vegan", value: "vegan", co2: 2.9, comparison: "Lowest food impact! 🌱", isGood: true },
      ],
    },
    {
      id: "food_waste",
      category: "Food",
      icon: "restaurant-menu",
      color: "#10B981",
      question: "How much food do you waste?",
      funFact: "1/3 of all food produced is wasted globally!",
      options: [
        { label: "A lot", value: "high", co2: 1.2, comparison: "Try meal planning!", isGood: false },
        { label: "Some", value: "medium", co2: 0.6, comparison: "Average waste" },
        { label: "Very little", value: "low", co2: 0.2, comparison: "Great job! 🍽️", isGood: true },
        { label: "Almost none", value: "minimal", co2: 0.05, comparison: "Excellent! Zero waste! ♻️", isGood: true },
      ],
    },
    {
      id: "local_food",
      category: "Food",
      icon: "local-dining",
      color: "#10B981",
      question: "Do you buy local/seasonal food?",
      funFact: "Imported food travels 1,500+ miles on average!",
      options: [
        { label: "Rarely", value: "rarely", co2: 0.8, comparison: "High transport emissions" },
        { label: "Sometimes", value: "sometimes", co2: 0.4, comparison: "Moderate impact" },
        { label: "Often", value: "often", co2: 0.15, comparison: "Good choice! 🥕", isGood: true },
        { label: "Always", value: "always", co2: 0.05, comparison: "Farm to table! 🌾", isGood: true },
      ],
    },
    // Waste questions
    {
      id: "waste_management",
      category: "Waste",
      icon: "delete",
      color: "#EF4444",
      question: "How do you manage waste?",
      funFact: "Recycling 1 ton of paper saves 17 trees!",
      options: [
        { label: "No recycling", value: "no_recycle", co2: 0.5, comparison: "Please recycle!", isGood: false },
        { label: "Some recycling", value: "some_recycle", co2: 0.3, comparison: "Good start!" },
        { label: "Regular recycling", value: "regular_recycle", co2: 0.15, comparison: "Great habit! ♻️", isGood: true },
        { label: "Compost + recycle", value: "compost", co2: 0.05, comparison: "Zero waste hero! 🌱", isGood: true },
      ],
    },
    {
      id: "plastic_use",
      category: "Waste",
      icon: "water-drop",
      color: "#EF4444",
      question: "Single-use plastic usage?",
      funFact: "1 million plastic bottles are bought every minute!",
      options: [
        { label: "Use frequently", value: "high", co2: 0.6, comparison: "Try reusables!", isGood: false },
        { label: "Use sometimes", value: "medium", co2: 0.3, comparison: "Reduce more!" },
        { label: "Rarely use", value: "low", co2: 0.1, comparison: "Good effort! 🥤", isGood: true },
        { label: "Never use", value: "none", co2: 0, comparison: "Plastic-free! 🌊", isGood: true },
      ],
    },
    // Consumption questions
    {
      id: "shopping_habits",
      category: "Consumption",
      icon: "shopping-bag",
      color: "#8B5CF6",
      question: "How often buy new items?",
      funFact: "Fast fashion = 10% of global carbon emissions!",
      options: [
        { label: "Very frequently", value: "very_frequent", co2: 2.5, comparison: "High consumption", isGood: false },
        { label: "Frequently", value: "frequent", co2: 1.5, comparison: "Average shopping" },
        { label: "Occasionally", value: "occasional", co2: 0.8, comparison: "Mindful buying!" },
        { label: "Rarely", value: "rare", co2: 0.3, comparison: "Minimalist! 👕", isGood: true },
        { label: "Secondhand only", value: "secondhand", co2: 0.1, comparison: "Circular economy! ♻️", isGood: true },
      ],
    },
    {
      id: "electronics",
      category: "Consumption",
      icon: "phone-android",
      color: "#8B5CF6",
      question: "How often upgrade electronics?",
      funFact: "Making 1 smartphone = 85 kg of CO₂!",
      options: [
        { label: "Every year", value: "yearly", co2: 0.8, comparison: "Frequent upgrades", isGood: false },
        { label: "Every 2-3 years", value: "occasional", co2: 0.3, comparison: "Average cycle" },
        { label: "Every 4+ years", value: "rare", co2: 0.1, comparison: "Long-lasting! 📱", isGood: true },
        { label: "Until broken", value: "minimal", co2: 0.05, comparison: "Repair culture! 🔧", isGood: true },
      ],
    },
    // Water questions
    {
      id: "water_usage",
      category: "Water",
      icon: "water-drop",
      color: "#06B6D4",
      question: "Daily water consumption?",
      funFact: "Treating water uses energy = CO₂ emissions!",
      options: [
        { label: "Long showers", value: "high", co2: 0.4, comparison: "High water use" },
        { label: "Average use", value: "medium", co2: 0.2, comparison: "Typical usage" },
        { label: "Conservative", value: "low", co2: 0.1, comparison: "Water saver! 💧", isGood: true },
        { label: "Very minimal", value: "minimal", co2: 0.05, comparison: "Excellent! 🚿", isGood: true },
      ],
    },
  ];

  // Initialize quiz with random questions
  useEffect(() => {
    selectRandomQuestions();
  }, []);

  const selectRandomQuestions = () => {
    // Separate questions by category and type
    const transportQuestions = allQuestions.filter(q => q.category === "Transportation" && !q.dependsOn);
    const energyQuestions = allQuestions.filter(q => q.category === "Energy" && !q.dependsOn);
    const foodQuestions = allQuestions.filter(q => q.category === "Food");
    const wasteQuestions = allQuestions.filter(q => q.category === "Waste");
    const consumptionQuestions = allQuestions.filter(q => q.category === "Consumption");
    const waterQuestions = allQuestions.filter(q => q.category === "Water");

    // Randomly select questions from each category
    const selected = [];
    
    // Always include 1 transport + follow-up (2 questions)
    const transport = transportQuestions[Math.floor(Math.random() * transportQuestions.length)];
    selected.push(transport);
    if (transport.followUp) {
      const followUp = allQuestions.find(q => q.id === transport.followUp);
      if (followUp) selected.push(followUp);
    }

    // Always include 1 energy + follow-up (2 questions)
    const energy = energyQuestions[Math.floor(Math.random() * energyQuestions.length)];
    selected.push(energy);
    if (energy.followUp) {
      const followUp = allQuestions.find(q => q.id === energy.followUp);
      if (followUp) selected.push(followUp);
    }

    // Randomly select 2 food questions
    const shuffledFood = [...foodQuestions].sort(() => Math.random() - 0.5);
    selected.push(...shuffledFood.slice(0, 2));

    // Randomly select 1-2 waste questions
    const shuffledWaste = [...wasteQuestions].sort(() => Math.random() - 0.5);
    selected.push(...shuffledWaste.slice(0, Math.random() > 0.5 ? 2 : 1));

    // Randomly select 1-2 consumption questions
    const shuffledConsumption = [...consumptionQuestions].sort(() => Math.random() - 0.5);
    selected.push(...shuffledConsumption.slice(0, Math.random() > 0.5 ? 2 : 1));

    // Maybe add water question (50% chance)
    if (Math.random() > 0.5 && waterQuestions.length > 0) {
      selected.push(waterQuestions[0]);
    }

    // Limit to 10 questions total
    setSelectedQuestions(selected.slice(0, 10));
  };

  const getComparison = (option, co2Impact) => {
    if (option.comparison) return option.comparison;
    
    // Generate dynamic comparisons based on CO2 impact
    if (co2Impact === 0) return "Zero emissions! Perfect! 🌟";
    if (co2Impact < 0.5) return "Very low impact! 🌱";
    if (co2Impact < 2) return "Moderate impact";
    if (co2Impact < 5) return "Consider alternatives";
    return "High impact - room for improvement";
  };

  const handleAnswer = (option) => {
    const question = selectedQuestions[currentQuestion];
    
    // Calculate CO2 for this answer
    let co2Impact = 0;
    
    if (question.dependsOn) {
      // This is a follow-up question, multiply with previous answer
      const previousAnswer = answers[question.dependsOn];
      if (previousAnswer) {
        co2Impact = previousAnswer.co2 * option.multiplier;
      }
    } else {
      co2Impact = option.co2;
    }

    // Show comparison and celebrate good choices
    const comparison = getComparison(option, co2Impact);
    setCurrentComparison(comparison);
    setShowComparison(true);
    
    if (option.isGood) {
      setCelebrateGoodChoice(true);
      setTimeout(() => setCelebrateGoodChoice(false), 1500);
    }

    // Fade out animation
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      // Store answer
      const newAnswers = {
        ...answers,
        [question.id]: { ...option, co2Impact, comparison },
      };
      setAnswers(newAnswers);
      setTotalCO2(totalCO2 + co2Impact);

      // Wait a bit to show comparison, then move to next
      setTimeout(() => {
        setShowComparison(false);
        
        // Move to next question or show results
        if (currentQuestion < selectedQuestions.length - 1) {
          setCurrentQuestion(currentQuestion + 1);
        } else {
          setShowResults(true);
          // Save results to backend
          saveResultsToBackend();
        }

        // Fade in animation
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 1500);
    });
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setTotalCO2(0);
    setShowResults(false);
    setShowComparison(false);
    setCelebrateGoodChoice(false);
    setSelectedCategory("All");
    fadeAnim.setValue(1);
    // Select new random questions for retake
    selectRandomQuestions();
  };

  // Get unique categories from answers
  const getCategories = () => {
    const categories = new Set();
    Object.entries(answers).forEach(([key, answer]) => {
      const question = selectedQuestions.find(q => q.id === key);
      if (question && answer.co2Impact) {
        categories.add(question.category);
      }
    });
    return ["All", ...Array.from(categories)];
  };

  // Filter answers by category
  const getFilteredAnswers = () => {
    if (selectedCategory === "All") {
      return Object.entries(answers);
    }
    return Object.entries(answers).filter(([key, answer]) => {
      const question = selectedQuestions.find(q => q.id === key);
      return question && question.category === selectedCategory && answer.co2Impact;
    });
  };

  // Calculate filtered total
  const getFilteredTotal = () => {
    if (selectedCategory === "All") return totalCO2;
    return getFilteredAnswers().reduce((sum, [key, answer]) => {
      return sum + (answer.co2Impact || 0);
    }, 0);
  };

  const getCO2Level = () => {
    const dailyCO2 = totalCO2;
    if (dailyCO2 < 10) return { level: "Excellent", color: "#10B981", icon: "eco" };
    if (dailyCO2 < 20) return { level: "Good", color: "#3B82F6", icon: "thumb-up" };
    if (dailyCO2 < 30) return { level: "Average", color: "#F59E0B", icon: "info" };
    return { level: "High", color: "#EF4444", icon: "warning" };
  };

  const saveResultsToBackend = async () => {
    try {
      const mobile = await AsyncStorage.getItem("mobile");
      if (!mobile) return;

      const result = getCO2Level();
      const yearlyTons = ((totalCO2 * 365) / 1000).toFixed(2);
      const treesNeeded = Math.ceil(totalCO2 * 365 / 21);
      const avgGlobal = 12;
      const percentVsAverage = (((totalCO2 - avgGlobal) / avgGlobal) * 100).toFixed(0);
      const betterThanAverage = totalCO2 < avgGlobal;

      // Organize breakdown by category
      const breakdown = {};
      Object.entries(answers).forEach(([key, answer]) => {
        const question = selectedQuestions.find(q => q.id === key);
        if (question && answer.co2Impact) {
          const category = question.category;
          
          if (!breakdown[category]) {
            breakdown[category] = {
              total: 0,
              percentage: 0,
              answers: []
            };
          }
          
          breakdown[category].total += answer.co2Impact;
          breakdown[category].answers.push({
            question: question.question,
            answer: answer.label,
            co2Impact: answer.co2Impact,
            comparison: answer.comparison || ""
          });
        }
      });

      // Calculate percentages
      Object.keys(breakdown).forEach(category => {
        breakdown[category].percentage = Math.round((breakdown[category].total / totalCO2) * 100);
        breakdown[category].total = parseFloat(breakdown[category].total.toFixed(2));
      });

      const payload = {
        mobile,
        totalCO2: parseFloat(totalCO2.toFixed(2)),
        yearlyTons: parseFloat(yearlyTons),
        treesNeeded,
        impactLevel: result.level,
        breakdown,
        vsGlobalAverage: {
          percentage: parseInt(percentVsAverage),
          betterThan: betterThanAverage
        },
        questionsAnswered: selectedQuestions.length
      };

      const response = await fetch(`${BASE_URL}/carbon-footprint/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log("✅ Carbon footprint saved successfully");
      } else {
        console.error("Failed to save carbon footprint:", data.detail);
      }
    } catch (error) {
      console.error("Error saving carbon footprint:", error);
      // Don't show error to user - saving is optional
    }
  };

  if (showResults) {
    const result = getCO2Level();
    const yearlyTons = ((totalCO2 * 365) / 1000).toFixed(2);
    const treesNeeded = Math.ceil(totalCO2 * 365 / 21); // One tree absorbs ~21kg CO2/year
    const avgGlobal = 12; // Global average kg CO2/day
    const percentVsAverage = (((totalCO2 - avgGlobal) / avgGlobal) * 100).toFixed(0);
    const betterThanAverage = totalCO2 < avgGlobal;

    return (
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.resultsContainer}>
            {/* Compact Header */}
            <View style={styles.resultsHeaderCompact}>
            <View style={styles.headerContent}>
              <View style={styles.headerIcon}>
                <MaterialIcons name="eco" size={28} color="#6366F1" />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Your Results</Text>
                <Text style={styles.headerSubtitle}>Carbon footprint analysis</Text>
              </View>
              </View>
            </View>

            {/* Score Card */}
            <View style={[styles.scoreCard, { borderLeftColor: result.color }]}>
            <View style={styles.scoreHeader}>
              <View style={[styles.scoreIconContainer, { backgroundColor: result.color + '15' }]}>
                <MaterialIcons name={result.icon} size={32} color={result.color} />
              </View>
              <View style={styles.scoreTextContainer}>
                <Text style={styles.scoreLabel}>Your Impact Level</Text>
                <Text style={[styles.scoreLevel, { color: result.color }]}>{result.level}</Text>
                </View>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
            <Animatable.View animation="fadeInUp" delay={100} style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <MaterialIcons name="today" size={24} color="#6366F1" />
              </View>
              <Text style={styles.statLabel}>Daily</Text>
              <Text style={styles.statValue}>{totalCO2.toFixed(2)}</Text>
              <Text style={styles.statUnit}>kg CO₂</Text>
            </Animatable.View>

            <Animatable.View animation="fadeInUp" delay={200} style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <MaterialIcons name="calendar-today" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.statLabel}>Yearly</Text>
              <Text style={styles.statValue}>{yearlyTons}</Text>
              <Text style={styles.statUnit}>tons CO₂</Text>
            </Animatable.View>

            <Animatable.View animation="fadeInUp" delay={300} style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <MaterialIcons name="park" size={24} color="#10B981" />
              </View>
              <Text style={styles.statLabel}>Trees Needed</Text>
              <Text style={styles.statValue}>{treesNeeded}</Text>
              <Text style={styles.statUnit}>trees/year</Text>
            </Animatable.View>
            </View>

            {/* Comparison with Global Average */}
            <Animatable.View animation="fadeInUp" delay={400} style={styles.comparisonSection}>
            <View style={styles.comparisonHeader}>
              <MaterialIcons 
                name={betterThanAverage ? "trending-down" : "trending-up"} 
                size={28} 
                color={betterThanAverage ? "#10B981" : "#F59E0B"} 
              />
              <View style={styles.comparisonTextContainer}>
                <Text style={styles.comparisonTitle}>
                  {betterThanAverage ? "Below Average! 🎉" : "Room for Improvement"}
                </Text>
                <Text style={styles.comparisonSubtitle}>
                  You're {Math.abs(percentVsAverage)}% {betterThanAverage ? "better" : "higher"} than global average ({avgGlobal} kg/day)
                </Text>
              </View>
            </View>
            <View style={styles.comparisonBar}>
              <View style={styles.comparisonBarFill}>
                <View 
                  style={[
                    styles.comparisonBarYou, 
                    { 
                      width: `${(totalCO2 / (avgGlobal * 2)) * 100}%`,
                      backgroundColor: betterThanAverage ? "#10B981" : "#F59E0B"
                    }
                  ]} 
                />
              </View>
              <View style={styles.comparisonLabels}>
                <Text style={styles.comparisonLabelText}>You: {totalCO2.toFixed(1)} kg</Text>
                <Text style={styles.comparisonLabelText}>Avg: {avgGlobal} kg</Text>
              </View>
            </View>
            </Animatable.View>

            {/* Real-World Equivalents */}
            <Animatable.View animation="fadeInUp" delay={500} style={styles.equivalentsSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.breakdownTitle}>Real-World Impact</Text>
              <MaterialIcons name="compare-arrows" size={20} color="#6366F1" />
            </View>
            <View style={styles.equivalentCard}>
              <MaterialIcons name="local-gas-station" size={24} color="#EF4444" />
              <Text style={styles.equivalentText}>
                = {(totalCO2 * 365 / 2.3).toFixed(0)} liters of gasoline/year
              </Text>
            </View>
            <View style={styles.equivalentCard}>
              <MaterialIcons name="phone-android" size={24} color="#3B82F6" />
              <Text style={styles.equivalentText}>
                = Charging {(totalCO2 * 2000).toFixed(0)} smartphones daily
              </Text>
            </View>
            <View style={styles.equivalentCard}>
              <MaterialIcons name="flight" size={24} color="#8B5CF6" />
              <Text style={styles.equivalentText}>
                = {(yearlyTons / 0.9).toFixed(1)} round-trip flights (short-haul)
              </Text>
            </View>
            <View style={styles.equivalentCard}>
              <MaterialIcons name="home" size={24} color="#F59E0B" />
              <Text style={styles.equivalentText}>
                = {(totalCO2 * 365 / 365).toFixed(0)} days of average home energy
              </Text>
            </View>
            </Animatable.View>

            {/* Breakdown Section */}
            <Animatable.View animation="fadeInUp" delay={600} style={styles.breakdownSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.breakdownTitle}>Breakdown by Category</Text>
                <MaterialIcons name="pie-chart" size={20} color="#6366F1" />
              </View>

              {/* Category Filter Chips */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.filterChipsContainer}
              >
                {getCategories().map((category) => (
                  <Pressable
                    key={category}
                    style={[
                      styles.filterChip,
                      selectedCategory === category && styles.filterChipActive
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      selectedCategory === category && styles.filterChipTextActive
                    ]}>
                      {category}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Filtered Total */}
              {selectedCategory !== "All" && (
                <View style={styles.filteredTotalCard}>
                  <Text style={styles.filteredTotalLabel}>{selectedCategory} Total:</Text>
                  <View style={styles.filteredTotalRow}>
                    <Text style={styles.filteredTotalValue}>
                      {getFilteredTotal().toFixed(2)} kg CO₂/day
                    </Text>
                    <Text style={styles.filteredTotalPercentage}>
                      ({((getFilteredTotal() / totalCO2) * 100).toFixed(0)}% of total)
                    </Text>
                  </View>
                </View>
              )}

              {/* Breakdown Items */}
              {getFilteredAnswers().map(([key, answer]) => {
                const question = selectedQuestions.find(q => q.id === key);
                if (!question || !answer.co2Impact) return null;
                
                const baseTotal = selectedCategory === "All" ? totalCO2 : getFilteredTotal();
                const percentage = ((answer.co2Impact / baseTotal) * 100).toFixed(0);
                
                return (
                  <View key={key} style={styles.breakdownItem}>
                    <View style={styles.breakdownLeft}>
                      <View style={[styles.breakdownIcon, { backgroundColor: question.color + '15' }]}>
                        <MaterialIcons name={question.icon} size={18} color={question.color} />
                      </View>
                      <View style={styles.breakdownTextContainer}>
                        <Text style={styles.breakdownCategory}>{question.category}</Text>
                        <Text style={styles.breakdownAnswer}>{answer.label}</Text>
                        {answer.comparison && (
                          <Text style={styles.breakdownComparison}>💡 {answer.comparison}</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.breakdownRight}>
                      <Text style={styles.breakdownCO2}>{answer.co2Impact.toFixed(2)} kg</Text>
                      <Text style={styles.breakdownPercentage}>{percentage}%</Text>
                    </View>
                  </View>
                );
              })}
            </Animatable.View>

            {/* Tips Section */}
            <Animatable.View animation="fadeInUp" delay={700} style={styles.tipsSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.tipsTitle}>Tips to Reduce</Text>
                <MaterialIcons name="lightbulb" size={20} color="#F59E0B" />
              </View>
              <View style={styles.tipCard}>
                <View style={styles.tipIconContainer}>
                  <MaterialIcons name="directions-bike" size={20} color="#10B981" />
                </View>
                <Text style={styles.tipText}>Use public transport or bike for short trips</Text>
              </View>
              <View style={styles.tipCard}>
                <View style={styles.tipIconContainer}>
                  <MaterialIcons name="restaurant" size={20} color="#10B981" />
                </View>
                <Text style={styles.tipText}>Reduce meat consumption, try plant-based meals</Text>
              </View>
              <View style={styles.tipCard}>
                <View style={styles.tipIconContainer}>
                  <MaterialIcons name="recycling" size={20} color="#10B981" />
                </View>
                <Text style={styles.tipText}>Recycle and compost your waste</Text>
              </View>
              <View style={styles.tipCard}>
                <View style={styles.tipIconContainer}>
                  <MaterialIcons name="bolt" size={20} color="#10B981" />
                </View>
                <Text style={styles.tipText}>Switch to renewable energy sources</Text>
              </View>
            </Animatable.View>

            {/* Action Buttons */}
            <Animatable.View animation="fadeInUp" delay={800} style={styles.actionButtons}>
              <Pressable style={styles.retakeButton} onPress={resetQuiz}>
                <MaterialIcons name="refresh" size={22} color="#fff" />
                <Text style={styles.retakeButtonText}>Retake Quiz</Text>
              </Pressable>
            </Animatable.View>

            <View style={styles.bottomPadding} />
          </View>
        </ScrollView>
      </View>
      </KeyboardAvoidingView>
    );
  }

  if (selectedQuestions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialIcons name="eco" size={48} color="#6366F1" />
        <Text style={styles.loadingText}>Preparing your quiz...</Text>
      </View>
    );
  }

  const question = selectedQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / selectedQuestions.length) * 100;

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
    <View style={styles.container}>
      {/* Celebrate Good Choice Animation - Fixed positioning */}
      {celebrateGoodChoice && (
        <View style={styles.celebrationContainer}>
          <Animatable.View 
            animation="bounceIn" 
            duration={800}
            style={styles.celebrationOverlay}
          >
            <Animatable.Text 
              animation="pulse" 
              iterationCount={3}
              duration={500}
              style={styles.celebrationEmoji}
            >
              🎉
            </Animatable.Text>
            <Text style={styles.celebrationText}>Great Choice!</Text>
          </Animatable.View>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

      {/* Compact Header */}
      <View style={styles.header}>
        {!showComparison ? (
          <View style={styles.headerContent}>
            <View style={styles.headerIcon}>
              <MaterialIcons name="eco" size={28} color="#6366F1" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>CO₂ Calculator</Text>
              <Text style={styles.headerSubtitle}>Question {currentQuestion + 1} of {selectedQuestions.length}</Text>
            </View>
          </View>
        ) : (
          <Animatable.View 
            animation="fadeIn" 
            style={styles.headerComparisonCard}
          >
            <MaterialIcons name="info" size={24} color="#6366F1" />
            <Text style={styles.headerComparisonText}>{currentComparison}</Text>
          </Animatable.View>
        )}
        
        {/* Progress Bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* Question Card */}
      <Animated.View style={[styles.questionCard, { opacity: fadeAnim }]}>
        <View style={[styles.categoryBadge, { backgroundColor: question.color + '15' }]}>
          <MaterialIcons name={question.icon} size={20} color={question.color} />
          <Text style={[styles.categoryText, { color: question.color }]}>{question.category}</Text>
        </View>

        <Text style={styles.questionText}>{question.question}</Text>

        {/* Fun Fact */}
        {question.funFact && (
          <View style={styles.funFactCard}>
            <MaterialIcons name="lightbulb" size={16} color="#F59E0B" />
            <Text style={styles.funFactText}>{question.funFact}</Text>
          </View>
        )}

        <View style={styles.optionsContainer}>
          {question.options.map((option, index) => (
            <Pressable
              key={index}
              style={({ pressed }) => [
                styles.optionButton,
                pressed && styles.optionButtonPressed,
              ]}
              onPress={() => handleAnswer(option)}
            >
              <View style={styles.optionLeft}>
                <View style={[
                  styles.optionDot,
                  option.isGood && styles.optionDotGood
                ]} />
                <Text style={styles.optionLabel}>{option.label}</Text>
              </View>
              <View style={styles.optionRight}>
                {!question.dependsOn && (
                  <View style={styles.co2Badge}>
                    <MaterialIcons name="cloud" size={14} color="#6366F1" />
                    <Text style={styles.co2Text}>
                      {option.co2 === 0 ? "0" : option.co2.toFixed(2)}
                    </Text>
                  </View>
                )}
                <MaterialIcons name="chevron-right" size={20} color="#CBD5E1" />
              </View>
            </Pressable>
          ))}
        </View>
      </Animated.View>

      {/* Current Total */}
      {totalCO2 > 0 && !showComparison && (
        <Animatable.View 
          animation="fadeIn"
          style={styles.currentTotal}
        >
          <View style={styles.totalIcon}>
            <MaterialIcons name="eco" size={18} color="#10B981" />
          </View>
          <Text style={styles.currentTotalLabel}>Current total:</Text>
          <Text style={styles.currentTotalValue}>{totalCO2.toFixed(2)} kg CO₂/day</Text>
        </Animatable.View>
      )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FE",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FE",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
  },
  celebrationContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  celebrationOverlay: {
    width: 150,
    height: 150,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  celebrationEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  celebrationText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#10B981",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  headerComparisonCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  headerComparisonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#4338CA",
    lineHeight: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#6366F1",
    borderRadius: 3,
  },
  questionCard: {
    margin: 16,
    marginTop: 20,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "700",
  },
  questionText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 20,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  optionsContainer: {
    gap: 10,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FAFBFC",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  optionButtonPressed: {
    backgroundColor: "#EEF2FF",
    borderColor: "#6366F1",
    transform: [{ scale: 0.98 }],
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  optionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#CBD5E1",
  },
  optionDotGood: {
    backgroundColor: "#10B981",
  },
  funFactCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  funFactText: {
    flex: 1,
    fontSize: 12,
    color: "#92400E",
    fontWeight: "600",
    lineHeight: 16,
  },
  comparisonCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: "#EEF2FF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#C7D2FE",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  comparisonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#4338CA",
    lineHeight: 20,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    flex: 1,
  },
  optionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  co2Badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  co2Text: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6366F1",
  },
  currentTotal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D1FAE5",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  totalIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
  },
  currentTotalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  currentTotalValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#10B981",
    marginLeft: "auto",
  },
  bottomPadding: {
    height: 20,
  },
  resultsContainer: {
    paddingHorizontal: 16,
  },
  resultsHeaderCompact: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  scoreCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  scoreHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  scoreIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreTextContainer: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 4,
  },
  scoreLevel: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F8F9FE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 2,
  },
  statUnit: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
  },
  breakdownSection: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  filterChipsContainer: {
    marginVertical: 12,
    marginHorizontal: -18,
    paddingHorizontal: 18,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F8F9FE",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  filteredTotalCard: {
    padding: 12,
    backgroundColor: "#EEF2FF",
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  filteredTotalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4338CA",
    marginBottom: 6,
  },
  filteredTotalRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: 6,
  },
  filteredTotalValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#6366F1",
  },
  filteredTotalPercentage: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6366F1",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  breakdownTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1E293B",
  },
  breakdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F9FE",
  },
  breakdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  breakdownIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  breakdownTextContainer: {
    flex: 1,
  },
  breakdownCategory: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  breakdownAnswer: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  breakdownComparison: {
    fontSize: 10,
    color: "#6366F1",
    fontWeight: "600",
    marginTop: 3,
    fontStyle: "italic",
  },
  breakdownRight: {
    alignItems: "flex-end",
  },
  breakdownCO2: {
    fontSize: 15,
    fontWeight: "800",
    color: "#6366F1",
  },
  breakdownPercentage: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    marginTop: 2,
  },
  tipsSection: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  tipsTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1E293B",
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  tipIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: "#065F46",
    fontWeight: "600",
    lineHeight: 18,
  },
  comparisonSection: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  comparisonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  comparisonTextContainer: {
    flex: 1,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 4,
  },
  comparisonSubtitle: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    lineHeight: 16,
  },
  comparisonBar: {
    gap: 8,
  },
  comparisonBarFill: {
    height: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    overflow: "hidden",
  },
  comparisonBarYou: {
    height: "100%",
    borderRadius: 6,
  },
  comparisonLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  comparisonLabelText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  equivalentsSection: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  equivalentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "#F8F9FE",
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  equivalentText: {
    flex: 1,
    fontSize: 13,
    color: "#1E293B",
    fontWeight: "600",
    lineHeight: 18,
  },
  actionButtons: {
    gap: 10,
  },
  retakeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#6366F1",
    padding: 16,
    borderRadius: 14,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  retakeButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
  },
});

export default CO2Calculator;
