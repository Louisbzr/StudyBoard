#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import uuid

class StudyBoardAPITester:
    def __init__(self, base_url="https://study-planner-pro-16.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()  # Use session to handle cookies
        self.session_token = None
        self.user_data = None
        self.test_board_id = None
        self.test_list_id = None
        self.test_card_id = None
        self.tests_run = 0
        self.tests_passed = 0
        
    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}: PASSED {details}")
        else:
            print(f"❌ {name}: FAILED {details}")
        return success

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make HTTP request with authentication"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        # Don't need to manually add Authorization header since we're using cookies
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)
            
            success = response.status_code == expected_status
            return success, response.json() if response.content and response.headers.get('content-type', '').startswith('application/json') else response.text
        except Exception as e:
            return False, str(e)

    def test_auth_registration(self):
        """Test user registration"""
        timestamp = int(datetime.now().timestamp())
        test_user = {
            "email": f"test.user.{timestamp}@example.com",
            "password": "TestPass123!",
            "name": "Test User"
        }
        
        success, response = self.make_request('POST', 'auth/register', test_user, 200)
        if success and isinstance(response, dict) and response.get('user_id'):
            self.user_data = response
            return self.log_test("Auth Registration", True, f"User created: {response['email']}")
        return self.log_test("Auth Registration", False, f"Response: {response}")

    def test_auth_login(self):
        """Test user login"""
        if not self.user_data:
            return self.log_test("Auth Login", False, "No user data from registration")
            
        login_data = {
            "email": self.user_data['email'],
            "password": "TestPass123!"
        }
        
        success, response = self.make_request('POST', 'auth/login', login_data, 200)
        if success and isinstance(response, dict) and response.get('user_id'):
            return self.log_test("Auth Login", True, f"Login successful: {response['email']}")
        return self.log_test("Auth Login", False, f"Response: {response}")

    def test_auth_me(self):
        """Test get current user"""
        success, response = self.make_request('GET', 'auth/me', None, 200)
        if success and isinstance(response, dict) and response.get('user_id'):
            return self.log_test("Auth Me", True, f"User info retrieved: {response['email']}")
        return self.log_test("Auth Me", False, f"Response: {response}")

    def test_boards_crud(self):
        """Test boards CRUD operations"""
        # Create board
        board_data = {
            "title": f"Test Board {datetime.now().strftime('%H:%M:%S')}",
            "description": "Test board description",
            "color": "#4F46E5"
        }
        
        success, response = self.make_request('POST', 'boards', board_data, 200)
        if not success or not isinstance(response, dict) or not response.get('board_id'):
            return self.log_test("Boards Create", False, f"Response: {response}")
        
        self.test_board_id = response['board_id']
        self.log_test("Boards Create", True, f"Board created: {self.test_board_id}")
        
        # Get all boards
        success, response = self.make_request('GET', 'boards', None, 200)
        if not success or not isinstance(response, list):
            return self.log_test("Boards List", False, f"Response: {response}")
        
        board_found = any(b.get('board_id') == self.test_board_id for b in response)
        self.log_test("Boards List", board_found, f"Found {len(response)} boards")
        
        # Get single board
        success, response = self.make_request('GET', f'boards/{self.test_board_id}', None, 200)
        if not success or not isinstance(response, dict):
            return self.log_test("Boards Get", False, f"Response: {response}")
        
        # Should have default lists created
        has_lists = isinstance(response.get('lists'), list) and len(response['lists']) == 3
        self.log_test("Boards Get", has_lists, f"Board has {len(response.get('lists', []))} default lists")
        
        # Store first list ID for card testing
        if has_lists:
            self.test_list_id = response['lists'][0]['list_id']
        
        return True

    def test_lists_crud(self):
        """Test lists CRUD operations"""
        if not self.test_board_id:
            return self.log_test("Lists CRUD", False, "No test board available")
        
        # Create new list
        list_data = {
            "title": f"Test List {datetime.now().strftime('%H:%M:%S')}",
            "board_id": self.test_board_id
        }
        
        success, response = self.make_request('POST', 'lists', list_data, 200)
        if not success or not isinstance(response, dict) or not response.get('list_id'):
            return self.log_test("Lists Create", False, f"Response: {response}")
        
        new_list_id = response['list_id']
        self.log_test("Lists Create", True, f"List created: {new_list_id}")
        
        # Update list
        update_data = {"title": "Updated List Title"}
        success, response = self.make_request('PUT', f'lists/{new_list_id}', update_data, 200)
        updated = success and isinstance(response, dict) and response.get('title') == "Updated List Title"
        self.log_test("Lists Update", updated, f"List title updated")
        
        # Delete list
        success, response = self.make_request('DELETE', f'lists/{new_list_id}', None, 200)
        self.log_test("Lists Delete", success, "List deleted")
        
        return True

    def test_cards_crud(self):
        """Test cards CRUD operations"""
        if not self.test_list_id:
            return self.log_test("Cards CRUD", False, "No test list available")
        
        # Create card
        card_data = {
            "title": f"Test Card {datetime.now().strftime('%H:%M:%S')}",
            "description": "Test card description",
            "list_id": self.test_list_id,
            "priority": "high",
            "tags": ["test", "automation"]
        }
        
        success, response = self.make_request('POST', 'cards', card_data, 200)
        if not success or not isinstance(response, dict) or not response.get('card_id'):
            return self.log_test("Cards Create", False, f"Response: {response}")
        
        self.test_card_id = response['card_id']
        self.log_test("Cards Create", True, f"Card created: {self.test_card_id}")
        
        # Get card details
        success, response = self.make_request('GET', f'cards/{self.test_card_id}', None, 200)
        if not success or not isinstance(response, dict):
            return self.log_test("Cards Get", False, f"Response: {response}")
        
        has_comments = 'comments' in response
        self.log_test("Cards Get", has_comments, "Card details with comments retrieved")
        
        # Update card
        update_data = {
            "title": "Updated Card Title",
            "description": "Updated description",
            "priority": "urgent"
        }
        success, response = self.make_request('PUT', f'cards/{self.test_card_id}', update_data, 200)
        updated = success and isinstance(response, dict) and response.get('title') == "Updated Card Title"
        self.log_test("Cards Update", updated, "Card updated")
        
        return True

    def test_checklist_operations(self):
        """Test checklist operations"""
        if not self.test_card_id:
            return self.log_test("Checklist Operations", False, "No test card available")
        
        # Add checklist item
        item_data = {"text": "Test checklist item"}
        success, response = self.make_request('POST', f'cards/{self.test_card_id}/checklist', item_data, 200)
        if not success or not isinstance(response, dict) or not response.get('item_id'):
            return self.log_test("Checklist Add", False, f"Response: {response}")
        
        item_id = response['item_id']
        self.log_test("Checklist Add", True, f"Checklist item added: {item_id}")
        
        # Update checklist item
        update_data = {"completed": True}
        success, response = self.make_request('PUT', f'cards/{self.test_card_id}/checklist/{item_id}', update_data, 200)
        self.log_test("Checklist Update", success, "Checklist item marked completed")
        
        # Delete checklist item
        success, response = self.make_request('DELETE', f'cards/{self.test_card_id}/checklist/{item_id}', None, 200)
        self.log_test("Checklist Delete", success, "Checklist item deleted")
        
        return True

    def test_comments_operations(self):
        """Test comment operations"""
        if not self.test_card_id:
            return self.log_test("Comments Operations", False, "No test card available")
        
        # Add comment
        comment_data = {
            "card_id": self.test_card_id,
            "text": "This is a test comment"
        }
        success, response = self.make_request('POST', 'comments', comment_data, 200)
        if not success or not isinstance(response, dict) or not response.get('comment_id'):
            return self.log_test("Comments Add", False, f"Response: {response}")
        
        self.log_test("Comments Add", True, f"Comment added: {response['comment_id']}")
        
        # Get comments
        success, response = self.make_request('GET', f'comments/{self.test_card_id}', None, 200)
        if not success or not isinstance(response, list):
            return self.log_test("Comments Get", False, f"Response: {response}")
        
        has_comment = len(response) > 0
        self.log_test("Comments Get", has_comment, f"Retrieved {len(response)} comments")
        
        return True

    def test_card_move_operation(self):
        """Test card move operation"""
        if not self.test_card_id or not self.test_board_id:
            return self.log_test("Card Move", False, "Missing test data")
        
        # Get board to find target list
        success, response = self.make_request('GET', f'boards/{self.test_board_id}', None, 200)
        if not success or not isinstance(response, dict) or not response.get('lists'):
            return self.log_test("Card Move Setup", False, "Cannot get board lists")
        
        lists = response['lists']
        if len(lists) < 2:
            return self.log_test("Card Move", False, "Need at least 2 lists for move operation")
        
        source_list = lists[0]['list_id']
        target_list = lists[1]['list_id']
        
        # Move card
        move_data = {
            "card_id": self.test_card_id,
            "source_list_id": source_list,
            "target_list_id": target_list,
            "new_position": 0
        }
        
        success, response = self.make_request('PUT', 'cards/move', move_data, 200)
        self.log_test("Card Move", success, f"Card moved from {source_list} to {target_list}")
        
        return success

    def test_templates(self):
        """Test board templates feature"""
        # Get templates
        success, response = self.make_request('GET', 'templates', None, 200)
        if not success or not isinstance(response, list):
            return self.log_test("Templates Get", False, f"Response: {response}")
        
        # Should have exactly 5 templates
        template_count = len(response)
        if template_count != 5:
            return self.log_test("Templates Count", False, f"Expected 5 templates, got {template_count}")
        
        self.log_test("Templates Get", True, f"Retrieved {template_count} templates")
        
        # Test template structure
        template = response[0]  # Get first template
        required_fields = ['template_id', 'name', 'description', 'color', 'icon', 'lists']
        has_all_fields = all(field in template for field in required_fields)
        self.log_test("Templates Structure", has_all_fields, f"Template has all required fields")
        
        # Test create board from template
        template_data = {
            "template_id": template['template_id'],
            "title": f"Test Template Board {datetime.now().strftime('%H:%M:%S')}"
        }
        
        success, response = self.make_request('POST', 'boards/from-template', template_data, 200)
        if not success or not isinstance(response, dict) or not response.get('board_id'):
            return self.log_test("Template Create Board", False, f"Response: {response}")
        
        template_board_id = response['board_id']
        self.log_test("Template Create Board", True, f"Board created from template: {template_board_id}")
        
        # Verify the template board has pre-filled content
        success, response = self.make_request('GET', f'boards/{template_board_id}', None, 200)
        if success and isinstance(response, dict):
            lists_count = len(response.get('lists', []))
            # Check if some lists have cards (templates should have pre-filled cards)
            has_cards = any(len(lst.get('cards', [])) > 0 for lst in response.get('lists', []))
            self.log_test("Template Board Content", has_cards, f"Template board has {lists_count} lists with pre-filled cards")
            
            # Cleanup template board
            self.make_request('DELETE', f'boards/{template_board_id}', None, 200)
        
        return True

    def test_stats(self):
        """Test statistics feature"""
        success, response = self.make_request('GET', 'stats', None, 200)
        if not success or not isinstance(response, dict):
            return self.log_test("Stats Get", False, f"Response: {response}")
        
        # Check required stats fields
        required_fields = [
            'total_boards', 'total_cards', 'completed_cards', 'completion_rate',
            'upcoming_deadlines', 'overdue_cards', 'overdue_list', 'upcoming_list',
            'top_tags', 'checklist_total', 'checklist_done'
        ]
        
        has_all_fields = all(field in response for field in required_fields)
        self.log_test("Stats Structure", has_all_fields, f"Stats has all required fields")
        
        # Validate data types
        numeric_fields = ['total_boards', 'total_cards', 'completed_cards', 'completion_rate', 'upcoming_deadlines', 'overdue_cards', 'checklist_total', 'checklist_done']
        list_fields = ['overdue_list', 'upcoming_list', 'top_tags']
        
        valid_types = True
        for field in numeric_fields:
            if not isinstance(response.get(field), (int, float)):
                valid_types = False
                break
        for field in list_fields:
            if not isinstance(response.get(field), list):
                valid_types = False
                break
        
        self.log_test("Stats Data Types", valid_types, "All stats fields have correct data types")
        
        return success

    def test_profile(self):
        """Test profile feature"""
        # Get profile
        success, response = self.make_request('GET', 'profile', None, 200)
        if not success or not isinstance(response, dict):
            return self.log_test("Profile Get", False, f"Response: {response}")
        
        # Should match user data
        profile_matches = (
            response.get('user_id') == self.user_data.get('user_id') and
            response.get('email') == self.user_data.get('email')
        )
        self.log_test("Profile Get", profile_matches, f"Profile data matches user: {response.get('email')}")
        
        # Update profile
        new_name = f"Updated Name {datetime.now().strftime('%H:%M:%S')}"
        update_data = {"name": new_name}
        
        success, response = self.make_request('PUT', 'profile', update_data, 200)
        if not success or not isinstance(response, dict):
            return self.log_test("Profile Update", False, f"Response: {response}")
        
        name_updated = response.get('name') == new_name
        self.log_test("Profile Update", name_updated, f"Profile name updated to: {new_name}")
        
        return success

    def cleanup_test_data(self):
        """Clean up test data"""
        if self.test_board_id:
            success, response = self.make_request('DELETE', f'boards/{self.test_board_id}', None, 200)
            self.log_test("Cleanup Board", success, "Test board deleted")

    def run_all_tests(self):
        """Run all backend API tests"""
        print(f"🚀 Starting StudyBoard Backend API Tests...")
        print(f"📍 Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Test authentication flow
        if not self.test_auth_registration():
            print("❌ Registration failed, skipping remaining tests")
            return False
        
        # Note: Registration automatically logs in the user, so we should have session
        # Let's verify by testing /auth/me
        self.test_auth_me()
        
        # Test core CRUD operations
        self.test_boards_crud()
        self.test_lists_crud()
        self.test_cards_crud()
        
        # Test advanced features
        self.test_checklist_operations()
        self.test_comments_operations()
        self.test_card_move_operation()
        
        # Test NEW features (iteration 2)
        self.test_templates()
        self.test_stats()
        self.test_profile()
        
        # Cleanup
        self.cleanup_test_data()
        
        # Print results
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed ({int(self.tests_passed/self.tests_run*100)}%)")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️ {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = StudyBoardAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())