"""
Automated Unit & Integration Tests for BEMS Flask Backend.
Architecture: 1 Building, 4 Floors, 4 Offices & 2 Meeting Halls per floor (24 Zones Total).
"""
import unittest
import json
from app import app

class BemsApiTestCase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_health(self):
        res = self.app.get('/api/health')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data.get('status'), 'ok')
        self.assertEqual(data.get('buildings_count'), 1)
        self.assertEqual(data.get('floors_count'), 4)
        self.assertEqual(data.get('total_zones'), 24)

    def test_dashboard_summary(self):
        res = self.app.get('/api/dashboard/summary')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn('total_predicted_energy_kw', data)
        self.assertIn('total_expected_energy_kw', data)
        self.assertIn('building', data)
        self.assertEqual(len(data['building']['floors']), 4)
        self.assertEqual(data['total_zones_count'], 24)

    def test_floor_details(self):
        res = self.app.get('/api/floor/floor-1')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data.get('id'), 'floor-1')
        self.assertEqual(len(data.get('zones', [])), 6)  # 4 offices + 2 meeting halls

    def test_dashboard_history(self):
        res = self.app.get('/api/dashboard/history')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn('history', data)
        self.assertGreater(len(data['history']), 0)
        self.assertEqual(data.get('interval'), '15m')

    def test_predict_shap(self):
        payload = {
            "Zone Type": "Office",
            "Occupancy": 45,
            "Temperature": 23.0,
            "Humidity": 48.0,
            "Weekend": "No",
            "Day/Night": "Day",
            "HVAC Status": "ON",
            "Fan Status": "ON",
            "Lighting Status": "ON"
        }
        res = self.app.post('/api/predict/shap', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data.get('status'), 'success')
        self.assertIn('predicted_energy_kwh', data)
        self.assertIn('shap_values', data)
        self.assertIn('top_positive_driver', data)

    def test_zone_control(self):
        payload = {
            "zone_id": "fl1-off-1",
            "hvac_status": "OFF",
            "lighting_status": "OFF"
        }
        res = self.app.post('/api/zone/control', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data.get('status'), 'success')
        self.assertEqual(data['updated_zone']['HVAC Status'], 'OFF')

    def test_settings_get_and_post(self):
        # GET
        res = self.app.get('/api/settings')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn('config', data)

        # POST
        res_post = self.app.post(
            '/api/settings',
            data=json.dumps({"electricityTariff": 0.22}),
            content_type='application/json'
        )
        self.assertEqual(res_post.status_code, 200)

if __name__ == '__main__':
    unittest.main()
