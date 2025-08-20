# Upline Position Decision System - Testing Guide

## Overview
This guide provides step-by-step instructions to test the upline-controlled LEFT/RIGHT position decision system in the Voltverashop MLM platform.

## Test Credentials

| User | Email | Password | Role | Description |
|------|-------|----------|------|-------------|
| Admin | admin@voltverashop.com | admin123 | Admin | System administrator |
| John | john.doe@example.com | admin123 | User | Level 1 member (upline) |
| Alice | alice.smith@example.com | defaultpass123 | User | Level 2 member |
| David | david.wilson@example.com | defaultpass123 | User | Level 2 member |
| Emma | emma.thompson@example.com | defaultpass123 | User | Level 3 member |

## Current Binary Tree Structure
```
Admin (Level 0)
└── John Doe (Level 1, LEFT under Admin)
    ├── Alice Smith (Level 2, LEFT under John)  
    │   └── Bob Johnson (Level 3, LEFT under Alice)
    │       └── Carol Davis (Level 4, LEFT under Bob)
    └── David Wilson (Level 2, RIGHT under John)
```

## Test Scenarios

### Test 1: Complete Upline Position Decision Workflow

**Objective:** Test the full recruitment flow with upline position control

**Steps:**
1. **Login as Alice** (recruiter)
   - Go to http://localhost:5000
   - Login with: alice.smith@example.com / defaultpass123
   - Navigate to "My Team" page

2. **Submit Recruitment Request**
   - Click "Add New Recruit" button
   - Fill form:
     - Full Name: "Test User 1"
     - Email: "testuser1@example.com"
     - Mobile: "555-9999"
   - Click "Submit Request"
   - ✅ **Expected:** Success message and recruit added to pending list

3. **Check Upline Decisions** (as John)
   - Logout from Alice's account
   - Login as John: john.doe@example.com / admin123
   - Navigate to "My Team" → "Position Decisions" tab
   - ✅ **Expected:** See "Test User 1" waiting for position decision

4. **Make Position Decision** (as John)
   - Click "LEFT" or "RIGHT" button for Test User 1
   - ✅ **Expected:** Success message and recruit moves to admin approval

5. **Admin Final Approval**
   - Logout from John's account
   - Login as Admin: admin@voltverashop.com / admin123
   - Navigate to "Admin" → "Pending Recruits"
   - ✅ **Expected:** See Test User 1 with John's position choice

6. **Complete Approval**
   - Set Package Amount: "1000.00"
   - Click "Approve"
   - ✅ **Expected:** User account created successfully

7. **Verify New User Login**
   - Logout from admin
   - Login with: testuser1@example.com / defaultpass123
   - ✅ **Expected:** Successful login to user dashboard

### Test 2: Position Validation System

**Objective:** Test that system prevents invalid position placements

**Steps:**
1. **Check Available Positions**
   - Login as Admin and view binary tree
   - Identify members with both LEFT and RIGHT positions filled
   - ✅ **Expected:** No available positions under fully occupied members

2. **Test Position Conflict**
   - Have someone recruit under a fully occupied position
   - Upline chooses an occupied position
   - ✅ **Expected:** System shows error and suggests available positions

### Test 3: Upline Rejection Workflow

**Objective:** Test what happens when upline rejects a recruit

**Steps:**
1. **Submit New Recruitment**
   - Login as any user with available positions
   - Submit recruitment request

2. **Reject Request** (as upline)
   - Login as the upline member
   - Go to "Position Decisions" tab
   - Click "REJECT" button
   - ✅ **Expected:** Recruit marked as rejected, no admin approval needed

3. **Verify Rejection**
   - Check that recruit doesn't appear in admin pending list
   - ✅ **Expected:** Recruitment request completely removed from system

### Test 4: Team Statistics Validation

**Objective:** Verify statistics update correctly after new placements

**Steps:**
1. **Record Initial Stats**
   - Login as John
   - Navigate to "My Team"
   - Note current statistics:
     - Direct Recruits
     - Total Downline
     - Active Members

2. **Complete New Recruitment**
   - Follow Test 1 to add a new recruit under John's network

3. **Verify Updated Stats**
   - Refresh John's team page
   - ✅ **Expected:** Statistics increased by 1 for relevant counters

### Test 5: Binary Tree Visualization

**Objective:** Test the visual binary tree display

**Steps:**
1. **View Binary Tree**
   - Login as any user
   - Navigate to "My Team" → "Binary Tree" tab
   - ✅ **Expected:** Visual tree showing correct relationships

2. **Verify Tree Structure**
   - Check that all members appear in correct positions
   - Verify LEFT/RIGHT placement accuracy
   - ✅ **Expected:** Tree matches actual database structure

3. **Test Tree Navigation**
   - Click on different members in the tree
   - ✅ **Expected:** Tree centers on selected member

## API Testing (Advanced)

For developers who want to test the backend APIs directly:

### Authentication
```bash
# Login as admin
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@voltverashop.com","password":"admin123"}' \
  -c cookies.txt

# Login as John
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john.doe@example.com","password":"admin123"}' \
  -c cookies_john.txt
```

### Test Recruitment API
```bash
# Submit recruitment (as Alice)
curl -X POST http://localhost:5000/api/team/recruit \
  -H "Content-Type: application/json" \
  -b cookies_alice.txt \
  -d '{"fullName":"API Test User","email":"apitest@example.com","mobile":"555-0000"}'
```

### Test Upline Decision API
```bash
# Get pending recruits (as John)
curl -b cookies_john.txt http://localhost:5000/api/upline/pending-recruits

# Make position decision (as John)
curl -X POST http://localhost:5000/api/upline/pending-recruits/{RECRUIT_ID}/decide \
  -H "Content-Type: application/json" \
  -b cookies_john.txt \
  -d '{"decision":"approved","position":"left"}'
```

### Test Admin Approval API
```bash
# Get pending recruits (as admin)
curl -b cookies.txt http://localhost:5000/api/admin/pending-recruits

# Approve recruit (as admin)
curl -X POST http://localhost:5000/api/admin/pending-recruits/{RECRUIT_ID}/approve \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"packageAmount":"1500.00"}'
```

## Expected Results Summary

✅ **Successful System Operation:**
- Recruitment requests flow through upline → admin approval
- Uplines can choose LEFT/RIGHT positions
- Position validation prevents conflicts
- Team statistics update correctly
- Binary tree visualization works
- New users can login with default credentials
- All UI components respond properly

⚠️ **Common Issues to Watch For:**
- Session timeouts during testing
- Position conflicts when tree is full
- Email validation errors
- Database connection issues
- Invalid position selections

## Troubleshooting

**Issue:** "Position already occupied" error
**Solution:** Check binary tree to find available positions

**Issue:** Session expired errors
**Solution:** Re-login and continue testing

**Issue:** User can't login after creation
**Solution:** Verify email/password combination and account status

**Issue:** Stats not updating
**Solution:** Refresh page or check network relationships

## Success Criteria

The system passes testing if:
1. ✅ Complete recruitment workflow functions end-to-end
2. ✅ Upline position decisions work correctly
3. ✅ Admin approvals create valid user accounts
4. ✅ Binary tree structure maintains integrity
5. ✅ Team statistics update accurately
6. ✅ All user interfaces respond properly
7. ✅ Position validation prevents errors
8. ✅ New users can access their accounts

This completes the comprehensive testing of the upline position decision system.