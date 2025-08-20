import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:camera/camera.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:permission_handler/permission_handler.dart';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter/services.dart';
import 'package:audioplayers/audioplayers.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final cameras = await availableCameras();
  runApp(CopeApp(cameras: cameras));
}

class CopeApp extends StatelessWidget {
  final List<CameraDescription> cameras;
  
  CopeApp({required this.cameras});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Copenhagen Scanner',
      theme: ThemeData(primarySwatch: Colors.green),
      home: HomePage(cameras: cameras),
    );
  }
}

class HomePage extends StatefulWidget {
  final List<CameraDescription> cameras;
  
  HomePage({required this.cameras});

  @override
  _HomePageState createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  CameraController? _cameraController;
  final TextEditingController _codeController = TextEditingController();
  final textRecognizer = TextRecognizer();
  final audioPlayer = AudioPlayer();
  bool _isSubmitting = false;
  bool _isScanning = false;
  String _extractedCode = '';

  @override
  void initState() {
    super.initState();
    _initializeCamera();
  }

  Future<void> _initializeCamera() async {
    await Permission.camera.request();
    if (widget.cameras.isNotEmpty) {
      _cameraController = CameraController(
        widget.cameras[0], 
        ResolutionPreset.high,
      );
      await _cameraController!.initialize();
      setState(() {});
    }
  }

  Future<void> _scanCode() async {
    if (_cameraController == null || !_cameraController!.value.isInitialized) {
      _showDialog('Error', 'Camera not ready');
      return;
    }

    setState(() => _isScanning = true);

    try {
      final image = await _cameraController!.takePicture();
      final inputImage = InputImage.fromFilePath(image.path);
      final recognizedText = await textRecognizer.processImage(inputImage);
      
      // Extract Copenhagen codes (pattern: *****-****-****)
      final text = recognizedText.text.replaceAll(' ', '').toUpperCase();
      final RegExp codePattern = RegExp(r'[A-Z0-9]{5}-[A-Z0-9]{4}-[A-Z0-9]{4}');
      final matches = codePattern.allMatches(text);
      
      if (matches.isNotEmpty) {
        final code = matches.first.group(0)!;
        setState(() {
          _extractedCode = code;
          _codeController.text = code;
        });
        
        // Play camera shutter sound
        await _playSound('scan');
        
        // Show code found and auto-submit after 2 seconds
        _showDialog('Code Found!', 'Scanned: $code\nAuto-submitting in 2 seconds...');
        
        // Auto-submit after 2 second delay
        Future.delayed(Duration(seconds: 2), () {
          if (_extractedCode == code) { // Make sure code hasn't changed
            _submitCode();
          }
        });
      } else {
        // Play error sound
        await _playSound('error');
        _showDialog('No Code Found', 'No Copenhagen code detected\nExpected format: *****-****-****');
      }
    } catch (e) {
      _showDialog('Scan Error', 'Failed to scan code: $e');
    } finally {
      setState(() => _isScanning = false);
    }
  }

  Future<void> _submitCode() async {
    final code = _extractedCode.isNotEmpty ? _extractedCode : _codeController.text;
    
    if (code.isEmpty) {
      _showDialog('Error', 'Please scan or enter a code');
      return;
    }

    setState(() => _isSubmitting = true);
    await _logMessage('Attempting to submit code: $code');

    try {
      await _logMessage('Trying direct submission to Fresh Cope...');
      
      // Try multiple endpoints and methods
      final endpoints = [
        'https://www.freshcope.com/rewards/submit',
        'https://www.freshcope.com/api/rewards',
        'https://freshcope.com/rewards/earn',
        'https://www.freshcope.com/rewards/earn',
      ];
      
      http.Response? response;
      
      for (final endpoint in endpoints) {
        try {
          await _logMessage('Trying endpoint: $endpoint');
          
          final headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 14; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          };
          
          final body = 'email=mike%40emke.com&password=cope123123A%21&code=$code';
          await _logMessage('Request body: $body');
          
          response = await http.post(Uri.parse(endpoint), headers: headers, body: body);
          await _logMessage('Response ${response.statusCode} from $endpoint');
          
          if (response.statusCode == 200) {
            break; // Success, stop trying other endpoints
          }
          
        } catch (e) {
          await _logMessage('Error with $endpoint: $e');
          continue;
        }
      }
      
      if (response == null) {
        throw Exception('All endpoints failed');
      }

      await _logMessage('Submission response: ${response.statusCode}');
      await _logMessage('Response body: ${response.body.substring(0, response.body.length > 500 ? 500 : response.body.length)}');

      if (response.statusCode == 200) {
        if (response.body.contains('success') || response.body.contains('points') || response.body.contains('thank')) {
          await _playSound('success');
          _showDialog('Success!', 'Code $code submitted to Fresh Cope!');
          await _logMessage('SUCCESS: Code $code submitted successfully');
          setState(() {
            _extractedCode = '';
            _codeController.clear();
          });
        } else {
          await _playSound('warning');
          _showDialog('Warning', 'Code submitted but response unclear. Check Fresh Cope account.');
          await _logMessage('WARNING: Code submitted but response unclear');
        }
      } else {
        // If API fails, offer to open browser
        await _logMessage('ERROR: Failed with status ${response.statusCode}');
        _showBrowserFallback(code);
      }
    } catch (e) {
      await _logMessage('ERROR: Network error - $e');
      _showBrowserFallback(code);
    } finally {
      setState(() => _isSubmitting = false);
    }
  }

  Future<void> _playSound(String type) async {
    try {
      switch (type) {
        case 'success':
          // High beep for success
          await audioPlayer.play(AssetSource('sounds/success.mp3'));
          break;
        case 'error':
          // Low buzz for error
          await audioPlayer.play(AssetSource('sounds/error.mp3'));
          break;
        case 'warning':
          // Medium tone for warning
          await audioPlayer.play(AssetSource('sounds/warning.mp3'));
          break;
        case 'scan':
          // Camera shutter sound
          await audioPlayer.play(AssetSource('sounds/camera.mp3'));
          break;
      }
    } catch (e) {
      // Fallback to haptic feedback if assets don't exist
      if (type == 'success') {
        HapticFeedback.mediumImpact();
      } else {
        HapticFeedback.heavyImpact();
      }
    }
  }

  void _showBrowserFallback(String code) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Auto-submit failed'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Code copied to clipboard: $code'),
            SizedBox(height: 10),
            Text('Open Fresh Cope website to submit manually?'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: code));
              await launchUrl(Uri.parse('https://www.freshcope.com/rewards/earn'));
              Navigator.pop(context);
            },
            child: Text('Open Website'),
          ),
        ],
      ),
    );
  }

  Future<void> _logMessage(String message) async {
    try {
      final directory = await getExternalStorageDirectory();
      final logFile = File('${directory!.path}/copescanner.log');
      final timestamp = DateTime.now().toIso8601String();
      await logFile.writeAsString('[$timestamp] $message\n', mode: FileMode.append);
    } catch (e) {
      print('Failed to log: $e');
    }
  }

  void _showDialog(String title, String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Copenhagen Scanner'),
        backgroundColor: Colors.green[700],
      ),
      body: Column(
        children: [
          // Camera Preview
          Expanded(
            flex: 3,
            child: _cameraController?.value.isInitialized == true
                ? Container(
                    width: double.infinity,
                    child: Stack(
                      children: [
                        Positioned.fill(
                          child: AspectRatio(
                            aspectRatio: _cameraController!.value.aspectRatio,
                            child: CameraPreview(_cameraController!),
                          ),
                        ),
                        Center(
                          child: Container(
                            width: 280,
                            height: 180,
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.green, width: 3),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Center(
                              child: Text(
                                'Point at Copenhagen code',
                                style: TextStyle(
                                  color: Colors.white,
                                  backgroundColor: Colors.black87,
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  )
                : Center(child: CircularProgressIndicator()),
          ),
          // Controls
          Expanded(
            flex: 2,
            child: Padding(
              padding: EdgeInsets.all(20),
              child: Column(
                children: [
                  // Scan Button
                  ElevatedButton.icon(
                    onPressed: _isScanning ? null : _scanCode,
                    icon: Icon(Icons.camera_alt),
                    label: Text(_isScanning ? 'Scanning...' : 'SCAN CODE'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green[700],
                      foregroundColor: Colors.white,
                      padding: EdgeInsets.symmetric(horizontal: 40, vertical: 15),
                      textStyle: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ),
                  SizedBox(height: 20),
                  // Manual Entry
                  TextField(
                    controller: _codeController,
                    decoration: InputDecoration(
                      labelText: 'Manual entry (*****-****-****)',
                      border: OutlineInputBorder(),
                      hintText: 'CABCD-1234-5678',
                    ),
                    textCapitalization: TextCapitalization.characters,
                    maxLength: 15,
                  ),
                  SizedBox(height: 10),
                  // Submit Button
                  if (_extractedCode.isNotEmpty || _codeController.text.isNotEmpty)
                    ElevatedButton(
                      onPressed: _isSubmitting ? null : _submitCode,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red[600],
                        foregroundColor: Colors.white,
                        padding: EdgeInsets.symmetric(horizontal: 40, vertical: 15),
                      ),
                      child: Text(
                        _isSubmitting ? 'Submitting...' : 'Submit to Fresh Cope',
                        style: TextStyle(fontSize: 16),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    textRecognizer.close();
    audioPlayer.dispose();
    super.dispose();
  }
}