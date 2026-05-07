"""
Smart Warehouse — API Test Suite
==================================
Comprehensive test coverage for core API endpoints.
Run with: pytest tests/ -v
"""

import pytest
from fastapi.testclient import TestClient
from app import app
from config import login_rate_limiter


@pytest.fixture(autouse=True)
def clear_rate_limits():
    """Clear rate limiter before each test to prevent 429 errors."""
    login_rate_limiter.clear()
    yield


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def auth_headers(client):
    """Get authenticated headers with Bearer token (admin user)."""
    response = client.post("/api/login", json={
        "username": "admin",
        "password": "admin123"
    })
    assert response.status_code == 200
    token = response.json()["token"]
    return {"Authorization": f"Bearer {token}"}


# ─── Auth Tests ───
class TestAuth:
    def test_login_success(self, client):
        response = client.post("/api/login", json={
            "username": "manager",
            "password": "manager123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["name"] == "Warehouse Manager"
        assert data["user"]["role"] == "manager"

    def test_login_wrong_password(self, client):
        response = client.post("/api/login", json={
            "username": "manager",
            "password": "wrongpassword"
        })
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client):
        response = client.post("/api/login", json={
            "username": "nobody",
            "password": "password123"
        })
        assert response.status_code == 401

    def test_verify_token_valid(self, client, auth_headers):
        response = client.get("/api/verify-token", headers=auth_headers)
        assert response.status_code == 200

    def test_verify_token_invalid(self, client):
        response = client.get("/api/verify-token", headers={
            "Authorization": "Bearer invalid-token-here"
        })
        assert response.status_code == 401


# ─── Settings Tests ───
class TestSettings:
    def test_get_settings(self, client):
        response = client.get("/api/settings")
        assert response.status_code == 200
        data = response.json()
        assert "cameraUrl" in data or "threshold" in data

    def test_update_settings(self, client, auth_headers):
        response = client.post("/api/settings", json={
            "threshold": 60
        }, headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["status"] == "success"

    def test_update_settings_unauthorized(self, client):
        response = client.post("/api/settings", json={"threshold": 60})
        assert response.status_code == 401


# ─── Logs Tests ───
class TestLogs:
    def test_get_logs(self, client, auth_headers):
        response = client.get("/api/logs", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_logs_unauthorized(self, client):
        response = client.get("/api/logs")
        assert response.status_code == 401


# ─── Analytics Tests ───
class TestAnalytics:
    def test_get_analytics_weekly(self, client, auth_headers):
        response = client.get("/api/analytics?time_range=weekly", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "trend" in data
        assert "distribution" in data
        assert "zone_activity" in data

    def test_get_status(self, client, auth_headers):
        response = client.get("/api/status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "Active"
        assert "ai_performance" in data


# ─── Camera Tests ───
class TestCamera:
    def test_camera_toggle_unauthorized(self, client):
        response = client.post("/api/camera/toggle", json={"state": True})
        assert response.status_code == 401

    def test_camera_toggle_on(self, client, auth_headers):
        response = client.post("/api/camera/toggle", json={"state": True}, headers=auth_headers)
        assert response.status_code == 200
        assert "started" in response.json()["message"].lower()

    def test_camera_toggle_off(self, client, auth_headers):
        response = client.post("/api/camera/toggle", json={"state": False}, headers=auth_headers)
        assert response.status_code == 200
        assert "stopped" in response.json()["message"].lower()


# ─── Invite System Tests ───
class TestInviteSystem:
    def test_invite_user_unauthorized(self, client):
        """Non-admin users cannot generate invitations."""
        response = client.post("/api/invite-user", json={
            "email": "newuser@example.com",
            "username": "newuser",
            "role": "operator"
        })
        assert response.status_code == 401

    def test_invite_user_success(self, client, auth_headers):
        """Admin can generate an invitation link."""
        response = client.post("/api/invite-user", json={
            "email": "invited@example.com",
            "username": "inviteduser",
            "role": "operator"
        }, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "invite_link" in data
        assert "token" in data

    def test_accept_invite_invalid_token(self, client):
        """Accepting with a bad token is rejected."""
        response = client.post("/api/accept-invite", json={
            "token": "bad-token-here",
            "name": "Test User",
            "password": "testpass123"
        })
        assert response.status_code == 400


# ─── Password Reset Tests ───
class TestPasswordReset:
    def test_forgot_password_nonexistent(self, client):
        response = client.post("/api/forgot-password", json={
            "email": "nobody@example.com"
        })
        assert response.status_code == 404

    def test_forgot_password_success(self, client):
        response = client.post("/api/forgot-password", json={
            "email": "manager@kawanlama.com"
        })
        assert response.status_code == 200
        data = response.json()
        assert "otp_code" in data
        assert len(data["otp_code"]) == 6

    def test_reset_password_wrong_code(self, client):
        # First request OTP
        client.post("/api/forgot-password", json={
            "email": "manager@kawanlama.com"
        })
        # Try wrong code
        response = client.post("/api/reset-password", json={
            "email": "manager@kawanlama.com",
            "code": "000000",
            "new_password": "newpassword123"
        })
        assert response.status_code == 400


# ─── Settings Reset Tests ───
class TestSettingsReset:
    def test_reset_settings(self, client, auth_headers):
        response = client.post("/api/settings/reset", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["status"] == "success"

    def test_reset_settings_unauthorized(self, client):
        response = client.post("/api/settings/reset")
        assert response.status_code == 401


# ─── Analytics Variations ───
class TestAnalyticsVariations:
    def test_analytics_daily(self, client, auth_headers):
        response = client.get("/api/analytics?time_range=daily", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()["trend"]) == 24  # 24 hours

    def test_analytics_monthly(self, client, auth_headers):
        response = client.get("/api/analytics?time_range=monthly", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()["trend"]) == 30  # 30 days


# ─── Health & Model Info Tests ───
class TestSystemEndpoints:
    def test_health_check(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "2.0.0"
        assert "model_loaded" in data

    def test_model_info(self, client):
        response = client.get("/api/model-info")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["loaded", "no_model"]
        if data["status"] == "loaded":
            assert "class_names" in data
            assert "model_file" in data
            assert data["framework"] == "Ultralytics YOLO11"
            # Verify training metrics are exposed
            if data.get("training"):
                assert "final_metrics" in data["training"]
                assert "mAP50" in data["training"]["final_metrics"]

    def test_training_artifact_invalid(self, client):
        """Requesting unknown artifact names is rejected."""
        response = client.get("/api/training-artifacts/malicious_file")
        assert response.status_code == 404
