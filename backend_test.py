import requests
import sys
import json
from datetime import datetime, timezone
import uuid

class ExpenseBuddyAPITester:
    def __init__(self, base_url="https://budget-tracker-166.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_email = f"test_user_{datetime.now().strftime('%H%M%S')}@test.com"
        self.test_user_password = "TestPass123!"
        self.test_user_name = "Test User"

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if not endpoint.startswith('http') else endpoint
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            print(f"   Response Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health check endpoint"""
        return self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )

    def test_get_categories(self):
        """Test getting categories (should work without auth)"""
        success, response = self.run_test(
            "Get Categories",
            "GET", 
            "categories",
            200
        )
        if success and isinstance(response, list) and len(response) > 0:
            print(f"   Found {len(response)} categories")
            return True, response
        return False, []

    def test_user_registration(self):
        """Test user registration"""
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": self.test_user_email,
                "name": self.test_user_name,
                "password": self.test_user_password
            }
        )
        
        if success and 'access_token' in response and 'user' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   User registered with ID: {self.user_id}")
            return True
        return False

    def test_user_login(self):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login", 
            200,
            data={
                "email": self.test_user_email,
                "password": self.test_user_password
            }
        )
        
        if success and 'access_token' in response:
            login_token = response['access_token']
            print(f"   Login successful, token received")
            return True
        return False

    def test_dashboard_without_auth(self):
        """Test dashboard endpoint without authentication (should fail)"""
        old_token = self.token
        self.token = None
        success, _ = self.run_test(
            "Dashboard Without Auth",
            "GET",
            "dashboard",
            403  # FastAPI returns 403 for missing auth
        )
        self.token = old_token
        return success

    def test_dashboard_with_auth(self):
        """Test dashboard endpoint with authentication"""
        return self.run_test(
            "Dashboard With Auth",
            "GET",
            "dashboard",
            200
        )

    def test_create_expense(self, categories):
        """Test creating an expense"""
        if not categories:
            print("❌ No categories available for expense creation")
            return False, None
            
        category = categories[0]  # Use first category
        expense_data = {
            "amount": 25.50,
            "category_id": category['id'],
            "description": "Test expense for lunch",
            "date": datetime.now(timezone.utc).isoformat()
        }
        
        success, response = self.run_test(
            "Create Expense",
            "POST",
            "expenses",
            200,
            data=expense_data
        )
        
        if success and 'id' in response:
            print(f"   Expense created with ID: {response['id']}")
            return True, response['id']
        return False, None

    def test_get_expenses(self):
        """Test getting user expenses"""
        return self.run_test(
            "Get Expenses",
            "GET",
            "expenses",
            200
        )

    def test_create_budget(self, categories):
        """Test creating a budget"""
        if not categories:
            print("❌ No categories available for budget creation")
            return False
            
        category = categories[1] if len(categories) > 1 else categories[0]
        budget_data = {
            "category_id": category['id'],
            "monthly_limit": 500.00
        }
        
        success, response = self.run_test(
            "Create Budget",
            "POST",
            "budgets",
            200,
            data=budget_data
        )
        
        return success

    def test_get_budgets(self):
        """Test getting user budgets"""
        return self.run_test(
            "Get Budgets",
            "GET",
            "budgets",
            200
        )

    def run_all_tests(self):
        """Run all API tests in sequence"""
        print("🚀 Starting ExpenseBuddy API Tests")
        print("=" * 50)
        
        # Test 1: Health Check
        health_success, _ = self.test_health_check()
        if not health_success:
            print("❌ Health check failed - API may be down")
            return False
            
        # Test 2: Get Categories (no auth required)
        categories_success, categories = self.test_get_categories()
        if not categories_success:
            print("❌ Categories endpoint failed")
            return False
            
        # Test 3: User Registration
        if not self.test_user_registration():
            print("❌ User registration failed")
            return False
            
        # Test 4: User Login
        if not self.test_user_login():
            print("❌ User login failed")
            return False
            
        # Test 5: Dashboard without auth (should fail)
        if not self.test_dashboard_without_auth():
            print("❌ Dashboard security test failed")
            return False
            
        # Test 6: Dashboard with auth
        if not self.test_dashboard_with_auth():
            print("❌ Dashboard with auth failed")
            return False
            
        # Test 7: Create Expense
        expense_success, expense_id = self.test_create_expense(categories)
        if not expense_success:
            print("❌ Create expense failed")
            return False
            
        # Test 8: Get Expenses
        if not self.test_get_expenses():
            print("❌ Get expenses failed")
            return False
            
        # Test 9: Create Budget
        if not self.test_create_budget(categories):
            print("❌ Create budget failed")
            return False
            
        # Test 10: Get Budgets
        if not self.test_get_budgets():
            print("❌ Get budgets failed")
            return False
            
        return True

def main():
    """Main test execution"""
    print("ExpenseBuddy API Testing Suite")
    print("=" * 50)
    
    tester = ExpenseBuddyAPITester()
    
    try:
        success = tester.run_all_tests()
        
        print("\n" + "=" * 50)
        print("📊 TEST RESULTS")
        print("=" * 50)
        print(f"Tests Run: {tester.tests_run}")
        print(f"Tests Passed: {tester.tests_passed}")
        print(f"Tests Failed: {tester.tests_run - tester.tests_passed}")
        print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
        
        if success and tester.tests_passed == tester.tests_run:
            print("\n🎉 All tests passed! API is working correctly.")
            return 0
        else:
            print(f"\n⚠️  Some tests failed. Please check the issues above.")
            return 1
            
    except Exception as e:
        print(f"\n💥 Test suite crashed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())