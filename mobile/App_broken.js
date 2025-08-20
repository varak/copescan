import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, TextInput, ScrollView, Vibration } from 'react-native';
import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import Tesseract from 'tesseract.js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USERNAME = 'mike@emke.com';
const PASSWORD = 'cope123123A!';

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraRef, setCameraRef] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedCode, setExtractedCode] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [submissionHistory, setSubmissionHistory] = useState([]);
  const [autoSubmitEnabled, setAutoSubmitEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        console.log('Requesting permissions...');
        
        // Request permissions in parallel
        const [cameraResult, mediaResult] = await Promise.all([
          Camera.requestCameraPermissionsAsync(),
          MediaLibrary.requestPermissionsAsync()
        ]);
        
        console.log('Camera permission:', cameraResult.status);
        console.log('Media library permission:', mediaResult.status);
        
        const permissionsGranted = cameraResult.status === 'granted' && mediaResult.status === 'granted';
        setHasPermission(permissionsGranted);
        
        if (!permissionsGranted) {
          console.log('Permissions denied - Camera:', cameraResult.status, 'Media:', mediaResult.status);
        }
        
        // Load submission history
        const history = await AsyncStorage.getItem('submissionHistory');
        if (history) {
          setSubmissionHistory(JSON.parse(history));
        }
      } catch (error) {
        console.error('Permission request error:', error);
        setHasPermission(false);
      }
    })();
  }, []);

  const playBeep = async (type = 'success') => {
    try {
      let soundData;
      switch (type) {
        case 'processing':
          soundData = 'data:audio/wav;base64,UklGRjIBAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQ4BAADn6VnMc7/kPeJHHYy3tbZtWdj3u75P7uJI8e7y';
          break;
        case 'error':
          soundData = 'data:audio/wav;base64,UklGRjwCAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRgCAAC4vYJ8JdH/+++7t/+ktaDh+eT19fbluu3V2O7xx/Lq8vPv9Oj17/Dz8fTu';
          break;
        default: // success
          soundData = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp6pgcBjiI1/LLcSQFKofJ8N6TSQo';
      }
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: soundData }, 
        { shouldPlay: true }
      );
      
      // Unload the sound after playing
      setTimeout(() => {
        sound.unloadAsync();
      }, 1000);
    } catch (error) {
      console.log('Error playing beep:', error);
    }
  };

  const takePicture = async () => {
    console.log('takePicture called, cameraRef:', !!cameraRef);
    if (!cameraRef) {
      console.log('ERROR: Camera reference not available');
      Alert.alert('Camera Error', 'Camera not ready. Please wait a moment and try again.');
      return;
    }
    
    try {
      setIsProcessing(true);
      
      // Play processing sound and haptic
      await playBeep('processing');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      console.log('Taking picture...');
      const photo = await cameraRef.takePictureAsync();
      console.log('Photo taken:', photo.uri);
      await MediaLibrary.saveToLibraryAsync(photo.uri);
      console.log('Photo saved to library');
      
      // Process image with OCR (mock for now due to React Native limitations)
      console.log('Starting OCR processing...');
      
      // Mock result for testing - replace with working OCR later
      const mockResult = { data: { text: 'TEST1-2345-6789 some other text' } };
      const result = mockResult;
      
      console.log('OCR raw text:', result.data.text);
      
      // Extract codes with pattern: *****-****-**** (letters and numbers)
      const text = result.data.text.replace(/\s/g, ''); // Remove spaces
      console.log('Text after space removal:', text);
      const codePattern = /[A-Z0-9]{5}-[A-Z0-9]{4}-[A-Z0-9]{4}/gi;
      const codes = text.match(codePattern);
      console.log('Matched codes:', codes);
      
      if (codes && codes.length > 0) {
        const code = codes[0].toUpperCase();
        setExtractedCode(code);
          
        // Play beep sound and haptic feedback on successful capture
        await playBeep();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        if (autoSubmitEnabled) {
          // Auto-submit the code
          Alert.alert('Code Found!', `Extracted: ${code}\nAuto-submitting...`);
          await submitCode(code);
        } else {
          Alert.alert('Code Found!', `Extracted: ${code}`);
        }
      } else {
          // Play error feedback
          await playBeep('error');
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Alert.alert('Code Not Found', 'Tips for better scanning:\n• Align code within the green frame\n• Ensure good lighting\n• Hold phone steady\n• Try manual input if needed');
        }
      } catch (error) {
        console.error('Error processing image:', error);
        // Play error feedback
        await playBeep('error');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Processing Failed', 'Image processing error. Please:\n• Check camera focus\n• Try better lighting\n• Use manual input if needed');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const resetForNextScan = () => {
    setExtractedCode('');
    setManualCode('');
    setShowManualInput(false);
  };

  const submitCode = async (code) => {
    try {
      setIsProcessing(true);
      
      // Create form data for submission
      const formData = new FormData();
      formData.append('username', USERNAME);
      formData.append('password', PASSWORD);
      formData.append('code', code);

      const response = await fetch('https://www.freshcope.com/rewards/earn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `username=${USERNAME}&password=${PASSWORD}&code=${code}`
      });

      if (response.ok) {
        Alert.alert('Success!', `Code ${code} submitted successfully`);
        
        // Save to history
        const newEntry = {
          code,
          timestamp: new Date().toISOString(),
          status: 'success'
        };
        const updatedHistory = [newEntry, ...submissionHistory.slice(0, 9)]; // Keep last 10
        setSubmissionHistory(updatedHistory);
        await AsyncStorage.setItem('submissionHistory', JSON.stringify(updatedHistory));
        
        // Auto-reset for next scan
        setTimeout(() => {
          resetForNextScan();
        }, 2000); // Wait 2 seconds before resetting
      } else {
        Alert.alert('Error', 'Failed to submit code. Check your internet connection.');
      }
    } catch (error) {
      console.error('Submission error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Requesting permissions...</Text></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.container}><Text>Camera access denied</Text></View>;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <Text style={styles.title}>CopeScan</Text>
      
      {!showManualInput ? (
        <View style={styles.cameraContainer}>
          <Camera 
            style={styles.camera} 
            type={Camera.Constants.Type.back}
            ref={ref => setCameraRef(ref)}
          />
          
          {/* Targeting Overlay */}
          <View style={styles.targetingOverlay} pointerEvents='none'>
            <View style={styles.targetingFrame}>
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
            </View>
            <Text style={styles.targetingText}>
              Align Copenhagen code within frame
            </Text>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.captureButton]}
              onPress={takePicture}
              disabled={isProcessing}
            >
              <Text style={styles.buttonText}>
                {isProcessing ? 'Processing...' : 'Capture Code'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.manualButton]}
              onPress={() => setShowManualInput(true)}
            >
              <Text style={styles.buttonText}>Manual Input</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.manualContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter code (*****-****-****)"
            value={manualCode}
            onChangeText={setManualCode}
            autoCapitalize="characters"
            maxLength={15}
          />
          <TouchableOpacity
            style={[styles.button, styles.backButton]}
            onPress={() => setShowManualInput(false)}
          >
            <Text style={styles.buttonText}>Back to Camera</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.settingsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.toggleButton, autoSubmitEnabled && styles.toggleActive]}
          onPress={() => setAutoSubmitEnabled(!autoSubmitEnabled)}
        >
          <Text style={styles.buttonText}>
            Auto-Submit: {autoSubmitEnabled ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>
        
        {(extractedCode || manualCode) && (
          <TouchableOpacity
            style={[styles.button, styles.resetButton]}
            onPress={resetForNextScan}
          >
            <Text style={styles.buttonText}>Reset & Scan Next</Text>
          </TouchableOpacity>
        )}
      </View>

      {(extractedCode || manualCode) && (
        <View style={styles.codeContainer}>
          <Text style={styles.codeText}>
            Code: {extractedCode || manualCode}
          </Text>
          {!autoSubmitEnabled && (
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={() => submitCode(extractedCode || manualCode)}
              disabled={isProcessing}
            >
              <Text style={styles.buttonText}>
                {isProcessing ? 'Submitting...' : 'Submit to Fresh Cope'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {submissionHistory.length > 0 && (
        <ScrollView style={styles.historyContainer}>
          <Text style={styles.historyTitle}>Recent Submissions:</Text>
          {submissionHistory.slice(0, 5).map((entry, index) => (
            <Text key={index} style={styles.historyItem}>
              {entry.code} - {new Date(entry.timestamp).toLocaleDateString()}
            </Text>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2E8B57',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  manualContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    minWidth: 120,
  },
  captureButton: {
    backgroundColor: '#2E8B57',
  },
  manualButton: {
    backgroundColor: '#4169E1',
  },
  backButton: {
    backgroundColor: '#708090',
  },
  submitButton: {
    backgroundColor: '#FF6347',
    marginTop: 10,
  },
  toggleButton: {
    backgroundColor: '#9370DB',
    margin: 5,
  },
  toggleActive: {
    backgroundColor: '#32CD32',
  },
  resetButton: {
    backgroundColor: '#FF8C00',
    margin: 5,
  },
  settingsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    padding: 10,
  },
  targetingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  targetingFrame: {
    width: 280,
    height: 120,
    position: 'relative',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#00FF00',
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#00FF00',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#00FF00',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#00FF00',
  },
  targetingText: {
    color: '#00FF00',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  codeContainer: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    margin: 20,
    borderRadius: 8,
  },
  codeText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  historyContainer: {
    maxHeight: 150,
    padding: 20,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  historyItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
});
}