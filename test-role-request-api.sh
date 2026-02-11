#!/bin/bash

# Role Request API Test Script
# Make sure backend is running on port 3001

echo "🧪 Testing Role Request API Endpoints"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3001"
ADMIN_TOKEN="YOUR_ADMIN_TOKEN_HERE"
USER_TOKEN="YOUR_USER_TOKEN_HERE"

echo -e "${YELLOW}⚠️  Please update ADMIN_TOKEN and USER_TOKEN in this script${NC}"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing Health Check..."
HEALTH=$(curl -s -w "\n%{http_code}" "${BASE_URL}/health")
HTTP_CODE=$(echo "$HEALTH" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend is not responding (HTTP $HTTP_CODE)${NC}"
    exit 1
fi
echo ""

# Test 2: Get Pending Requests (Admin)
echo "2️⃣  Testing GET /api/role-requests/pending (Admin)..."
PENDING=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    "${BASE_URL}/api/role-requests/pending?page=1&limit=10")
HTTP_CODE=$(echo "$PENDING" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Pending requests endpoint working${NC}"
    echo "$PENDING" | head -n-1 | jq '.data | length' 2>/dev/null || echo "Response received"
else
    echo -e "${RED}❌ Failed (HTTP $HTTP_CODE)${NC}"
    echo "$PENDING" | head -n-1
fi
echo ""

# Test 3: Get All Requests (Admin)
echo "3️⃣  Testing GET /api/role-requests/all (Admin)..."
ALL=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    "${BASE_URL}/api/role-requests/all?page=1&limit=10")
HTTP_CODE=$(echo "$ALL" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ All requests endpoint working${NC}"
else
    echo -e "${RED}❌ Failed (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Test 4: Get My Requests (User)
echo "4️⃣  Testing GET /api/role-requests/my-requests (User)..."
MY=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer ${USER_TOKEN}" \
    "${BASE_URL}/api/role-requests/my-requests")
HTTP_CODE=$(echo "$MY" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ My requests endpoint working${NC}"
else
    echo -e "${RED}❌ Failed (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Test 5: Submit Role Request (User) - Requires form data
echo "5️⃣  Testing POST /api/role-requests/apply (User)..."
echo -e "${YELLOW}ℹ️  Skipping file upload test (run manually with actual files)${NC}"
echo ""
echo "To test manually, run:"
echo -e "${YELLOW}curl -X POST ${BASE_URL}/api/role-requests/apply \\"
echo "  -H \"Authorization: Bearer \$USER_TOKEN\" \\"
echo "  -F 'requestedRoles=[\"ARTIST\"]' \\"
echo "  -F 'reason=Testing' \\"
echo "  -F 'contact=test@example.com' \\"
echo "  -F 'text_ARTIST=https://portfolio.com' \\"
echo "  -F 'document_ARTIST=@/path/to/file.pdf'${NC}"
echo ""

# Summary
echo "======================================"
echo -e "${GREEN}🎉 Basic API tests completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Update tokens in this script"
echo "2. Test file uploads manually"
echo "3. Test approve/reject endpoints"
echo "4. Test frontend integration"
