import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:http/http.dart' as http;
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:permission_handler/permission_handler.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Copenhagen Scanner',
      theme: ThemeData(
        primarySwatch: Colors.green,
      ),
      home: CopeScannerHome(),
    );
  }
}

class CopeScannerHome extends StatefulWidget {
  @override
  _CopeScannerHomeState createState() => _CopeScannerHomeState();
}

class _CopeScannerHomeState extends State<CopeScannerHome> {
  CameraController? _cameraController;
  List<CameraDescription>? _cameras;
  String _extractedCode = '';
  final TextEditingController _manualController = TextEditingController();
  bool _isProcessing = false;
  final textRecognizer = TextRecognizer();

  final String username = 'mike@emke.com';
  final String password = 'cope123123A!';

  @override
  void initState() {
    super.initState();
    _initializeCamera();
  }

  Future<void> _initializeCamera() async {
    await Permission.camera.request();
    _cameras = await availableCameras();
    if (_cameras!.isNotEmpty) {
      _cameraController = CameraController(_cameras![0], ResolutionPreset.high);
      await _cameraController!.initialize();
      setState(() {});
    }
  }

  Future<void> _takePicture() async {
    if (_cameraController == null || !_cameraController!.value.isInitialized) return;
    
    setState(() {
      _isProcessing = true;
    });

    try {
      final image = await _cameraController!.takePicture();
      final inputImage = InputImage.fromFilePath(image.path);
      final recognizedText = await textRecognizer.processImage(inputImage);
      
      final text = recognizedText.text.replaceAll(' ', '');
      final RegExp codePattern = RegExp(r'[A-Z0-9]{5}-[A-Z0-9]{4}-[A-Z0-9]{4}', caseSensitive: false);
      final matches = codePattern.allMatches(text);
      
      if (matches.isNotEmpty) {
        final code = matches.first.group(0)!.toUpperCase();
        setState(() {
          _extractedCode = code;
        });
        _showDialog('Code Found!', 'Extracted: $code');
      } else {
        _showDialog('No Code Found', 'Expected format: *****-****-****');
      }
    } catch (e) {
      _showDialog('Error', 'Failed to process image');
    } finally {
      setState(() {
        _isProcessing = false;
      });
    }
  }

  Future<void> _submitCode(String code) async {
    setState(() {
      _isProcessing = true;
    });

    try {
      final response = await http.post(
        Uri.parse('https://www.freshcope.com/rewards/earn'),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: 'username=$username&password=$password&code=$code',
      );

      if (response.statusCode == 200) {
        _showDialog('Success!', 'Code $code submitted');
        setState(() {
          _extractedCode = '';
          _manualController.clear();
        });
      } else {
        _showDialog('Error', 'Failed to submit code');
      }
    } catch (e) {
      _showDialog('Error', 'Network error');
    } finally {
      setState(() {
        _isProcessing = false;
      });
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
          Expanded(
            flex: 3,
            child: _cameraController?.value.isInitialized == true
                ? CameraPreview(_cameraController!)
                : Center(child: CircularProgressIndicator()),
          ),
          Expanded(
            flex: 2,
            child: Padding(
              padding: EdgeInsets.all(16.0),
              child: Column(
                children: [
                  ElevatedButton(
                    onPressed: _isProcessing ? null : _takePicture,
                    child: Text(_isProcessing ? 'Processing...' : 'Capture Code'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                    ),
                  ),
                  SizedBox(height: 20),
                  TextField(
                    controller: _manualController,
                    decoration: InputDecoration(
                      labelText: 'Enter code (*****-****-****)',
                      border: OutlineInputBorder(),
                    ),
                    textCapitalization: TextCapitalization.characters,
                    maxLength: 15,
                  ),
                  if (_extractedCode.isNotEmpty || _manualController.text.isNotEmpty)
                    Column(
                      children: [
                        Text(
                          'Code: ${_extractedCode.isNotEmpty ? _extractedCode : _manualController.text}',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        SizedBox(height: 10),
                        ElevatedButton(
                          onPressed: _isProcessing
                              ? null
                              : () => _submitCode(_extractedCode.isNotEmpty ? _extractedCode : _manualController.text),
                          child: Text(_isProcessing ? 'Submitting...' : 'Submit'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red[600],
                            foregroundColor: Colors.white,
                          ),
                        ),
                      ],
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
    super.dispose();
  }
}
