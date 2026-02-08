package app.lovable.screencapture;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.ActivityCallback;

@CapacitorPlugin(name = "ScreenCapture")
public class ScreenCapturePlugin extends Plugin {
    private static final String TAG = "ScreenCapturePlugin";
    
    private MediaProjectionManager projectionManager;
    private MediaProjection mediaProjection;
    private boolean isCapturing = false;
    private Intent mediaProjectionIntent;
    private int mediaProjectionResultCode;

    @Override
    public void load() {
        super.load();
        projectionManager = (MediaProjectionManager) getContext()
            .getSystemService(Context.MEDIA_PROJECTION_SERVICE);
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", projectionManager != null);
        ret.put("platform", "android");
        call.resolve(ret);
    }

    @PluginMethod
    public void startCapture(PluginCall call) {
        if (isCapturing) {
            call.reject("Screen capture already in progress");
            return;
        }
        
        try {
            Intent captureIntent = projectionManager.createScreenCaptureIntent();
            startActivityForResult(call, captureIntent, "handleCaptureResult");
        } catch (Exception e) {
            Log.e(TAG, "Error starting screen capture", e);
            call.reject("Failed to start screen capture: " + e.getMessage());
        }
    }

    @ActivityCallback
    private void handleCaptureResult(PluginCall call, android.app.Activity activity, android.content.Intent data, int resultCode) {
        if (resultCode == Activity.RESULT_OK && data != null) {
            try {
                // Store the intent and result code for later use
                mediaProjectionIntent = data;
                mediaProjectionResultCode = resultCode;
                
                // Start the foreground service FIRST (required on Android 10+)
                Intent serviceIntent = new Intent(getContext(), ScreenCaptureService.class);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    getContext().startForegroundService(serviceIntent);
                } else {
                    getContext().startService(serviceIntent);
                }
                
                // Small delay to ensure service is started
                new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                    try {
                        // Now get the media projection
                        mediaProjection = projectionManager.getMediaProjection(mediaProjectionResultCode, mediaProjectionIntent);
                        isCapturing = true;
                        
                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        ret.put("message", "Screen capture started");
                        call.resolve(ret);
                        
                        // Notify JS that capture is ready
                        notifyListeners("captureStarted", new JSObject());
                        
                    } catch (Exception e) {
                        Log.e(TAG, "Error getting media projection", e);
                        stopService();
                        call.reject("Failed to get media projection: " + e.getMessage());
                    }
                }, 100);
                
            } catch (Exception e) {
                Log.e(TAG, "Error starting foreground service", e);
                call.reject("Failed to start screen capture service: " + e.getMessage());
            }
        } else {
            call.reject("Screen capture permission denied");
        }
    }

    @PluginMethod
    public void stopCapture(PluginCall call) {
        if (mediaProjection != null) {
            mediaProjection.stop();
            mediaProjection = null;
        }
        isCapturing = false;
        
        // Stop the foreground service
        stopService();
        
        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("message", "Screen capture stopped");
        call.resolve(ret);
        
        // Notify JS that capture stopped
        notifyListeners("captureStopped", new JSObject());
    }

    @PluginMethod
    public void isCapturing(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("capturing", isCapturing);
        call.resolve(ret);
    }
    
    private void stopService() {
        try {
            Intent serviceIntent = new Intent(getContext(), ScreenCaptureService.class);
            getContext().stopService(serviceIntent);
        } catch (Exception e) {
            Log.e(TAG, "Error stopping service", e);
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (mediaProjection != null) {
            mediaProjection.stop();
            mediaProjection = null;
        }
        isCapturing = false;
        stopService();
        super.handleOnDestroy();
    }
}
