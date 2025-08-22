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
  int? _userPoints;
  bool _isLoadingPoints = false;

  final String username = 'mike@emke.com';
  final String password = 'cope123123A!';

  @override
  void initState() {
    super.initState();
    _initializeCamera();
    _fetchUserPoints();
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

  Future<void> _fetchUserPoints() async {
    setState(() => _isLoadingPoints = true);
    
    try {
      final response = await http.post(
        Uri.parse('https://www.freshcope.com/rewards/redeem'),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Referer': 'https://www.freshcope.com/',
        },
        body: 'username=${Uri.encodeComponent(username)}&password=${Uri.encodeComponent(password)}',
      );

      if (response.statusCode == 200) {
        final responseText = response.body.toLowerCase();
        
        // Look for points balance patterns
        final patterns = [
          RegExp(r'(?:current\s*balance|available\s*points|your\s*points)[:\s]*(\d+)', caseSensitive: false),
          RegExp(r'(\d+)\s*(?:points?\s*available|points?\s*balance)', caseSensitive: false),
          RegExp(r'balance[:\s]*(\d+)', caseSensitive: false),
          RegExp(r'(\d+)\s*points?', caseSensitive: false),
        ];
        
        for (final pattern in patterns) {
          final match = pattern.firstMatch(responseText);
          if (match != null && match.group(1) != null) {
            final points = int.tryParse(match.group(1)!);
            if (points != null) {
              setState(() => _userPoints = points);
              return;
            }
          }
        }
      }
    } catch (e) {
      print('Error fetching points: $e');
    } finally {
      setState(() => _isLoadingPoints = false);
    }
  }

  Map<String, dynamic> _detectSubmissionResult(String responseText, String submittedCode) {
    final text = responseText.toLowerCase();
    final length = responseText.length;
    
    // Short response or success page indicators
    if (length < 5000 || text.contains('thank') || text.contains('success') || text.contains('earned')) {
      return {'success': true, 'message': 'Code submitted successfully!'};
    }
    
    // If response is homepage (>15000 chars), analyze the submitted code
    if (length > 15000 && (text.contains('copenhagen') && text.contains('home page'))) {
      return _analyzeCodeFailure(submittedCode);
    }
    
    return {'success': false, 'message': 'Code submission failed. Please try again.'};
  }

  Map<String, dynamic> _analyzeCodeFailure(String code) {
    final codePattern = RegExp(r'^[A-Z0-9]{5}-[A-Z0-9]{4}-[A-Z0-9]{4}$');
    
    // Check if code matches expected format
    if (!codePattern.hasMatch(code)) {
      if (code.length != 14) {
        return {
          'success': false,
          'message': 'Code format error: Expected 14 characters (XXXXX-XXXX-XXXX), got ${code.length}. OCR may have misread the code.'
        };
      }
      
      if (!code.contains('-') || code.split('-').length != 3) {
        return {
          'success': false,
          'message': 'Code format error: Missing dashes (-). OCR may have misread the separators. Try manual input.'
        };
      }
      
      final parts = code.split('-');
      if (parts[0].length != 5 || parts[1].length != 4 || parts[2].length != 4) {
        return {
          'success': false,
          'message': 'Code format error: Expected XXXXX-XXXX-XXXX format. Got ${parts[0].length}-${parts[1].length}-${parts[2].length}. OCR may have misread the code.'
        };
      }
      
      final invalidChars = RegExp(r'[^A-Z0-9\-]').allMatches(code);
      if (invalidChars.isNotEmpty) {
        final chars = invalidChars.map((m) => m.group(0)).join(', ');
        return {
          'success': false,
          'message': 'Code contains invalid characters: $chars. OCR may have misread these. Try manual input.'
        };
      }
    }
    
    // If format is correct, check for OCR issues
    if (codePattern.hasMatch(code)) {
      if (code.contains('AAAA') || code.contains('1111') || code.contains('0000')) {
        return {
          'success': false,
          'message': 'Code appears to contain repeated characters. OCR may have misread the code. Please check and re-scan or use manual input.'
        };
      }
      
      final confusingChars = RegExp(r'[OIL]').allMatches(code);
      if (confusingChars.isNotEmpty) {
        final chars = confusingChars.map((m) => m.group(0)).join("', '");
        return {
          'success': false,
          'message': 'Code may contain OCR errors. Found \'$chars\' which could be \'0\', \'1\', or other characters. Try manual input or re-scan.'
        };
      }
      
      return {
        'success': false,
        'message': 'Code already used or invalid. If you believe the code is correct, it may have been previously submitted.'
      };
    }
    
    return {
      'success': false,
      'message': 'Code submission failed. Please check the code format and try again.'
    };
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
        final result = _detectSubmissionResult(response.body, code);
        
        if (result['success']) {
          _showDialog('Success!', result['message']);
          
          // Refresh points after successful submission
          await _fetchUserPoints();
          
          setState(() {
            _extractedCode = '';
            _manualController.clear();
          });
        } else {
          _showDialog('Submission Failed', result['message']);
        }
      } else {
        _showDialog('Network Error', 'Failed to submit code. Status: ${response.statusCode}');
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
          // Points Display
          Container(
            width: double.infinity,
            padding: EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            child: InkWell(
              onTap: _isLoadingPoints ? null : _fetchUserPoints,
              child: Container(
                padding: EdgeInsets.all(15),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(12),
                  border: Border(
                    left: BorderSide(color: Colors.green[700]!, width: 4),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black12,
                      blurRadius: 4,
                      offset: Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Current Points:',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.black87,
                      ),
                    ),
                    Text(
                      _isLoadingPoints 
                        ? 'Loading...' 
                        : _userPoints != null 
                          ? '$_userPoints' 
                          : 'Tap to refresh',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.green[700],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
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
