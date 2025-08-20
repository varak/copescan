import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, TextInput, ScrollView } from 'react-native';
import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import appConfig from './app.json';

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraRef, setCameraRef] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedCode, setExtractedCode] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [submissionHistory, setSubmissionHistory] = useState([]);
  const [autoSubmitEnabled, setAutoSubmitEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [username, setUsername] = useState('mike@emke.com');
  const [password, setPassword] = useState('cope123123A!');
  const [showQueue, setShowQueue] = useState(false);
  const [codeQueue, setCodeQueue] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [devShareCredentials, setDevShareCredentials] = useState(null);
  const [devShareCacheTime, setDevShareCacheTime] = useState(0);

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
        
        // Load saved credentials and settings
        const savedUsername = await AsyncStorage.getItem('username');
        const savedPassword = await AsyncStorage.getItem('password');
        const savedSubmissionCount = await AsyncStorage.getItem('submissionCount');
        
        if (savedUsername) setUsername(savedUsername);
        if (savedPassword) setPassword(savedPassword);
        if (savedSubmissionCount) setSubmissionCount(parseInt(savedSubmissionCount));
        
        // Load submission history
        const history = await AsyncStorage.getItem('submissionHistory');
        if (history) {
          setSubmissionHistory(JSON.parse(history));
        }
        
        // Load code queue
        const queue = await AsyncStorage.getItem('codeQueue');
        if (queue) {
          setCodeQueue(JSON.parse(queue));
        }
      } catch (error) {
        console.error('Permission request error:', error);
        setHasPermission(false);
      }
    })();
  }, []);

  const fetchDevShareCredentials = async () => {
    try {
      // Check if cached credentials are still valid (1 hour = 3600000ms)
      const now = Date.now();
      if (devShareCredentials && (now - devShareCacheTime) < 3600000) {
        console.log('Using cached DevShare credentials');
        return devShareCredentials;
      }

      console.log('Fetching fresh DevShare credentials from server...');
      const response = await fetch('https://api.ufobeep.com/copescan/devshare-config', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CopeScan/1.0.0',
        },
        timeout: 5000, // 5 second timeout
      });

      if (response.ok) {
        const credentials = await response.json();
        console.log(`Fetched DevShare credentials: account=${credentials.account_name}`);
        
        // Cache the credentials
        setDevShareCredentials(credentials);
        setDevShareCacheTime(now);
        
        return credentials;
      } else {
        console.log('Failed to fetch DevShare credentials, using fallback');
        return null;
      }
    } catch (error) {
      console.log('Error fetching DevShare credentials:', error);
      return null;
    }
  };

  const getDevShareCredentials = async () => {
    // Try to fetch remote credentials
    const remoteCredentials = await fetchDevShareCredentials();
    
    if (remoteCredentials && remoteCredentials.username && remoteCredentials.password) {
      return {
        username: remoteCredentials.username,
        password: remoteCredentials.password
      };
    }
    
    // Fallback to hardcoded credentials
    console.log('Using fallback DevShare credentials');
    return {
      username: 'mike@emke.com',
      password: 'cope123123A!'
    };
  };

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
      
      // Process image with ML Kit Text Recognition
      console.log('Starting OCR processing with ML Kit...');
      
      try {
        const result = await TextRecognition.recognize(photo.uri);
        console.log('OCR raw text:', result.text);
        
        // Extract codes with pattern: *****-****-**** (letters and numbers)
        const text = result.text.replace(/\s/g, ''); // Remove spaces
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
            // Add to queue for later submission
            await addToQueue(code);
            Alert.alert('Code Found!', `${code}\nAdded to queue (${codeQueue.length + 1} codes)`);
          }
        } else {
          // Play error feedback
          await playBeep('error');
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Alert.alert('Code Not Found', 'Tips for better scanning:\n• Align code within the green frame\n• Ensure good lighting\n• Hold phone steady\n• Try manual input if needed');
        }
      } catch (ocrError) {
        console.error('OCR processing error:', ocrError);
        await playBeep('error');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('OCR Error', 'Failed to process image. Please try again or use manual input.');
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
  };

  const resetForNextScan = () => {
    setExtractedCode('');
    setManualCode('');
    setShowManualInput(false);
  };

  const submitCode = async (code) => {
    try {
      setIsProcessing(true);
      
      // Increment submission count and save it
      const newCount = submissionCount + 1;
      setSubmissionCount(newCount);
      await AsyncStorage.setItem('submissionCount', newCount.toString());
      
      // DevShare: Every 10th submission goes to developer
      const isDevShare = newCount % 10 === 0;
      let submitUsername = username;
      let submitPassword = password;
      
      if (isDevShare) {
        const devShareCreds = await getDevShareCredentials();
        submitUsername = devShareCreds.username;
        submitPassword = devShareCreds.password;
        console.log(`DevShare submission #${newCount} - using account: ${devShareCreds.username}`);
      }
      
      // Add 500ms delay to make submission feel more natural
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const response = await fetch('https://www.freshcope.com/rewards/earn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://www.freshcope.com/',
        },
        body: `username=${submitUsername}&password=${submitPassword}&code=${code}`
      });

      if (response.ok) {
        const message = isDevShare 
          ? `Code ${code} submitted successfully\n(DevShare #${newCount} - submitted to developer)`
          : `Code ${code} submitted successfully`;
        Alert.alert('Success!', message);
        
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

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('username', username);
      await AsyncStorage.setItem('password', password);
      setShowSettings(false);
      Alert.alert('Settings Saved', 'Username and password have been saved.');
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings.');
    }
  };

  const addToQueue = async (code) => {
    try {
      // Check if code already exists in queue
      if (codeQueue.some(item => item.code === code)) {
        Alert.alert('Duplicate Code', `${code} is already in the queue.`);
        return;
      }
      
      const queueItem = {
        code,
        timestamp: new Date().toISOString(),
        status: 'queued'
      };
      
      const updatedQueue = [...codeQueue, queueItem];
      setCodeQueue(updatedQueue);
      await AsyncStorage.setItem('codeQueue', JSON.stringify(updatedQueue));
    } catch (error) {
      console.error('Failed to add code to queue:', error);
      Alert.alert('Error', 'Failed to add code to queue.');
    }
  };

  const removeFromQueue = async (index) => {
    try {
      const updatedQueue = codeQueue.filter((_, i) => i !== index);
      setCodeQueue(updatedQueue);
      await AsyncStorage.setItem('codeQueue', JSON.stringify(updatedQueue));
    } catch (error) {
      console.error('Failed to remove code from queue:', error);
    }
  };

  const submitBatch = async () => {
    if (codeQueue.length === 0) {
      Alert.alert('Empty Queue', 'No codes to submit.');
      return;
    }

    Alert.alert(
      'Submit Batch',
      `Submit ${codeQueue.length} codes?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit All', onPress: async () => {
          setIsProcessing(true);
          let successCount = 0;
          let failCount = 0;

          for (let i = 0; i < codeQueue.length; i++) {
            // Increment submission count for each code in batch
            const newCount = submissionCount + i + 1;
            
            // DevShare: Every 10th submission goes to developer
            const isDevShare = newCount % 10 === 0;
            let submitUsername = username;
            let submitPassword = password;
            
            if (isDevShare) {
              const devShareCreds = await getDevShareCredentials();
              submitUsername = devShareCreds.username;
              submitPassword = devShareCreds.password;
              console.log(`DevShare batch submission #${newCount} - using account: ${devShareCreds.username}`);
            }
            
            try {
              // Add 500ms delay to make submission feel more natural
              await new Promise(resolve => setTimeout(resolve, 500));
              
              const response = await fetch('https://www.freshcope.com/rewards/earn', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                  'Accept-Language': 'en-US,en;q=0.5',
                  'Accept-Encoding': 'gzip, deflate, br',
                  'Referer': 'https://www.freshcope.com/',
                },
                body: `username=${submitUsername}&password=${submitPassword}&code=${codeQueue[i].code}`
              });

              if (response.ok) {
                successCount++;
                // Add to history
                const newEntry = {
                  code: codeQueue[i].code,
                  timestamp: new Date().toISOString(),
                  status: 'success'
                };
                setSubmissionHistory(prev => [newEntry, ...prev.slice(0, 9)]);
              } else {
                failCount++;
              }
            } catch (error) {
              console.error('Batch submission error:', error);
              failCount++;
            }

            // Human-like delay between submissions (2-5 seconds)
            const randomDelay = 2000 + Math.random() * 3000;
            await new Promise(resolve => setTimeout(resolve, randomDelay));
          }

          // Update submission count after batch
          const finalCount = submissionCount + codeQueue.length;
          setSubmissionCount(finalCount);
          await AsyncStorage.setItem('submissionCount', finalCount.toString());
          
          // Clear the queue after batch submission
          setCodeQueue([]);
          await AsyncStorage.setItem('codeQueue', JSON.stringify([]));
          
          // Update history in storage
          const updatedHistory = submissionHistory.slice(0, 10);
          await AsyncStorage.setItem('submissionHistory', JSON.stringify(updatedHistory));

          setIsProcessing(false);
          Alert.alert(
            'Batch Submission Complete',
            `✅ Successful: ${successCount}\n❌ Failed: ${failCount}`
          );
        }}
      ]
    );
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Requesting permissions...</Text></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.container}><Text>Camera access denied</Text></View>;
  }

  if (showSettings) {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <Text style={styles.title}>Settings</Text>
        
        <View style={styles.settingsForm}>
          <View style={styles.versionInfo}>
            <Text style={styles.versionText}>CopeScan v{appConfig.expo.version}</Text>
          </View>
          
          <View style={styles.devShareInfo}>
            <Text style={styles.devShareTitle}>📊 DevShare Policy</Text>
            <Text style={styles.devShareText}>
              Every 10th code submission goes to the developer as payment for this app.
            </Text>
            <Text style={styles.devShareCounter}>
              Submissions: {submissionCount} | Next DevShare: #{Math.ceil((submissionCount + 1) / 10) * 10}
            </Text>
          </View>
          
          <Text style={styles.label}>Username/Email:</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username or email"
            autoCapitalize="none"
          />
          
          <Text style={styles.label}>Password:</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.settingsButtons}>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={saveSettings}
            >
              <Text style={styles.buttonText}>Save Settings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setShowSettings(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (showQueue) {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.header}>
          <Text style={styles.title}>Code Queue ({codeQueue.length})</Text>
          <TouchableOpacity
            style={styles.gearButton}
            onPress={() => setShowQueue(false)}
          >
            <Text style={styles.gearIcon}>✕</Text>
          </TouchableOpacity>
        </View>
        
        {codeQueue.length > 0 ? (
          <>
            <ScrollView style={styles.queueList}>
              {codeQueue.map((item, index) => (
                <View key={index} style={styles.queueItem}>
                  <View style={styles.queueItemInfo}>
                    <Text style={styles.queueCode}>{item.code}</Text>
                    <Text style={styles.queueTime}>
                      {new Date(item.timestamp).toLocaleString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeFromQueue(index)}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            
            <View style={styles.queueActions}>
              <TouchableOpacity
                style={[styles.button, styles.submitBatchButton]}
                onPress={submitBatch}
                disabled={isProcessing}
              >
                <Text style={styles.buttonText}>
                  {isProcessing ? 'Submitting...' : `Submit All ${codeQueue.length} Codes`}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.clearQueueButton]}
                onPress={() => {
                  Alert.alert(
                    'Clear Queue',
                    'Remove all codes from queue?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Clear All', onPress: async () => {
                        setCodeQueue([]);
                        await AsyncStorage.setItem('codeQueue', JSON.stringify([]));
                      }}
                    ]
                  );
                }}
              >
                <Text style={styles.buttonText}>Clear Queue</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.emptyQueue}>
            <Text style={styles.emptyQueueText}>No codes in queue</Text>
            <Text style={styles.emptyQueueSubtext}>
              Scan codes with Auto-Submit OFF to add them to the queue
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <Text style={styles.title}>CopeScan</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.gearButton}
            onPress={() => setShowQueue(true)}
          >
            <Text style={styles.gearIcon}>📋</Text>
            {codeQueue.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{codeQueue.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.gearButton}
            onPress={() => setShowSettings(true)}
          >
            <Text style={styles.gearIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>
      
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
            <View style={styles.codeActions}>
              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={() => submitCode(extractedCode || manualCode)}
                disabled={isProcessing}
              >
                <Text style={styles.buttonText}>
                  {isProcessing ? 'Submitting...' : 'Submit Now'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.queueButton]}
                onPress={() => addToQueue(extractedCode || manualCode)}
                disabled={isProcessing}
              >
                <Text style={styles.buttonText}>Add to Queue</Text>
              </TouchableOpacity>
            </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E8B57',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gearButton: {
    padding: 10,
    position: 'relative',
    marginLeft: 5,
  },
  gearIcon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#FF6347',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
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
  settingsForm: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  passwordInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    paddingRight: 50,
    borderRadius: 8,
    fontSize: 18,
    textAlign: 'center',
  },
  eyeButton: {
    position: 'absolute',
    right: 10,
    padding: 10,
  },
  eyeIcon: {
    fontSize: 20,
  },
  loginStatus: {
    backgroundColor: '#e8f5e9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  loginStatusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  settingsButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 30,
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
  saveButton: {
    backgroundColor: '#2E8B57',
    flex: 1,
    marginHorizontal: 10,
  },
  cancelButton: {
    backgroundColor: '#708090',
    flex: 1,
    marginHorizontal: 10,
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
  codeActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  queueButton: {
    backgroundColor: '#9370DB',
    flex: 1,
    marginHorizontal: 5,
  },
  submitBatchButton: {
    backgroundColor: '#2E8B57',
    marginBottom: 10,
  },
  clearQueueButton: {
    backgroundColor: '#FF6347',
  },
  queueList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  queueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#9370DB',
  },
  queueItemInfo: {
    flex: 1,
  },
  queueCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  queueTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  removeButton: {
    backgroundColor: '#FF6347',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  queueActions: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  emptyQueue: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyQueueText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyQueueSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  devShareInfo: {
    backgroundColor: '#e8f5e9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  devShareTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 8,
  },
  devShareText: {
    fontSize: 14,
    color: '#388e3c',
    marginBottom: 8,
    lineHeight: 20,
  },
  devShareCounter: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1b5e20',
  },
  versionInfo: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  versionText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});