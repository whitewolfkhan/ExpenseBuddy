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

    def test_get_expenses_basic(self):
        """Test getting user expenses (basic)"""
        return self.run_test(
            "Get Expenses (Basic)",
            "GET",
            "expenses",
            200
        )

    def test_get_expenses_with_pagination(self):
        """Test expenses with pagination"""
        return self.run_test(
            "Get Expenses (Pagination)",
            "GET",
            "expenses?page=1&limit=5",
            200
        )

    def test_get_expenses_with_filters(self, categories):
        """Test expenses with advanced filters"""
        if not categories:
            return False
            
        category_id = categories[0]['id']
        # Test category filter
        success1, _ = self.run_test(
            "Get Expenses (Category Filter)",
            "GET",
            f"expenses?category_id={category_id}",
            200
        )
        
        # Test amount range filter
        success2, _ = self.run_test(
            "Get Expenses (Amount Filter)",
            "GET",
            "expenses?min_amount=10&max_amount=100",
            200
        )
        
        # Test search filter
        success3, _ = self.run_test(
            "Get Expenses (Search Filter)",
            "GET",
            "expenses?search=lunch",
            200
        )
        
        # Test date range filter
        success4, _ = self.run_test(
            "Get Expenses (Date Filter)",
            "GET",
            "expenses?start_date=2024-01-01&end_date=2024-12-31",
            200
        )
        
        return success1 and success2 and success3 and success4

    def test_get_expenses_with_sorting(self):
        """Test expenses with sorting"""
        success1, _ = self.run_test(
            "Get Expenses (Sort by Amount Desc)",
            "GET",
            "expenses?sort_by=amount&sort_order=desc",
            200
        )
        
        success2, _ = self.run_test(
            "Get Expenses (Sort by Date Asc)",
            "GET",
            "expenses?sort_by=date&sort_order=asc",
            200
        )
        
        return success1 and success2

    def test_update_expense(self, expense_id, categories):
        """Test updating an expense"""
        if not expense_id or not categories:
            return False
            
        update_data = {
            "amount": 35.75,
            "description": "Updated test expense",
            "category_id": categories[0]['id']
        }
        
        return self.run_test(
            "Update Expense",
            "PUT",
            f"expenses/{expense_id}",
            200,
            data=update_data
        )

    def test_delete_expense(self, expense_id):
        """Test deleting an expense"""
        if not expense_id:
            return False
            
        return self.run_test(
            "Delete Expense",
            "DELETE",
            f"expenses/{expense_id}",
            200
        )

    def test_create_budget(self, categories):
        """Test creating a budget"""
        if not categories:
            print("❌ No categories available for budget creation")
            return False, None
            
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
        
        if success and 'id' in response:
            print(f"   Budget created with ID: {response['id']}")
            return True, response['id']
        return False, None

    def test_get_budgets(self):
        """Test getting user budgets"""
        return self.run_test(
            "Get Budgets",
            "GET",
            "budgets",
            200
        )

    def test_update_budget(self, budget_id):
        """Test updating a budget"""
        if not budget_id:
            return False
            
        update_data = {
            "monthly_limit": 750.00
        }
        
        return self.run_test(
            "Update Budget",
            "PUT",
            f"budgets/{budget_id}",
            200,
            data=update_data
        )

    def test_delete_budget(self, budget_id):
        """Test deleting a budget"""
        if not budget_id:
            return False
            
        return self.run_test(
            "Delete Budget",
            "DELETE",
            f"budgets/{budget_id}",
            200
        )

    def test_get_alerts(self):
        """Test getting budget alerts and spending insights"""
        return self.run_test(
            "Get Alerts",
            "GET",
            "alerts",
            200
        )

    def run_all_tests(self):
        """Run all API tests in sequence"""
        print("🚀 Starting ExpenseBuddy Enhanced API Tests")
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
            
        # Test 8: Get Expenses (Basic)
        if not self.test_get_expenses_basic():
            print("❌ Get expenses (basic) failed")
            return False
            
        # Test 9: Get Expenses with Pagination
        if not self.test_get_expenses_with_pagination():
            print("❌ Get expenses with pagination failed")
            return False
            
        # Test 10: Get Expenses with Filters
        if not self.test_get_expenses_with_filters(categories):
            print("❌ Get expenses with filters failed")
            return False
            
        # Test 11: Get Expenses with Sorting
        if not self.test_get_expenses_with_sorting():
            print("❌ Get expenses with sorting failed")
            return False
            
        # Test 12: Update Expense
        if not self.test_update_expense(expense_id, categories):
            print("❌ Update expense failed")
            return False
            
        # Test 13: Create Budget
        budget_success, budget_id = self.test_create_budget(categories)
        if not budget_success:
            print("❌ Create budget failed")
            return False
            
        # Test 14: Get Budgets
        if not self.test_get_budgets():
            print("❌ Get budgets failed")
            return False
            
        # Test 15: Update Budget
        if not self.test_update_budget(budget_id):
            print("❌ Update budget failed")
            return False
            
        # Test 16: Get Alerts
        if not self.test_get_alerts():
            print("❌ Get alerts failed")
            return False
            
        # Test 17: Delete Expense
        if not self.test_delete_expense(expense_id):
            print("❌ Delete expense failed")
            return False
            
        # Test 18: Delete Budget
        if not self.test_delete_budget(budget_id):
            print("❌ Delete budget failed")
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