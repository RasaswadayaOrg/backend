# API Client Usage Examples

This document shows how to use the `api-client.ts` file to make API calls.

## Installation & Setup

### 1. Import the API Client

```typescript
// Import the singleton instance
import apiClient from './api-client';

// Or import specific functions
import { login, getUsers, approveApplication } from './api-client';

// Or create a new instance with custom base URL
import { ApiClient } from './api-client';
const client = new ApiClient('https://api.example.com');
```

### 2. Set Base URL (Optional)

```typescript
// Default: http://localhost:3001
// To use a different URL, create a new instance:
import { ApiClient } from './api-client';

const apiClient = new ApiClient('https://production-api.example.com');
```

---

## Usage Examples

### 1. Authentication

#### Login
```typescript
import apiClient from './api-client';

// Login and automatically set token
try {
  const response = await apiClient.login({
    email: 'admin@example.com',
    password: 'password123'
  });
  
  console.log('Logged in as:', response.data.user.fullName);
  console.log('Token:', response.data.token);
  // Token is automatically stored in apiClient
} catch (error) {
  console.error('Login failed:', error.message);
}
```

#### Manual Token Management
```typescript
// Set token manually
apiClient.setToken('your-jwt-token-here');

// Get current token
const token = apiClient.getToken();

// Clear token (logout)
apiClient.logout();
```

---

### 2. User Management

#### Get All Users
```typescript
// Get all users (default pagination)
const response = await apiClient.getUsers();
console.log('Users:', response.data);
console.log('Total:', response.pagination.total);

// With filters and pagination
const filtered = await apiClient.getUsers({
  role: 'USER',
  search: 'john',
  page: 1,
  limit: 20
});

// Loop through users and check for applications
filtered.data.forEach(user => {
  console.log(`${user.fullName} has ${user.roleApplications.length} applications`);
  
  user.roleApplications.forEach(app => {
    console.log(`  - ${app.role}: ${app.status}`);
  });
});
```

#### Get Single User Details
```typescript
const userId = 'cml6szjne0000bwbakrzffcir';
const userDetails = await apiClient.getUserById(userId);

console.log('User:', userDetails.data.user);
console.log('Artist Profile:', userDetails.data.artistProfile);
console.log('Orders:', userDetails.data.orders);
console.log('Applications:', userDetails.data.roleApplications);
```

#### Update User Role
```typescript
const userId = 'user123';
const response = await apiClient.updateUserRole(userId, 'ARTIST');
console.log('Updated user:', response.data);
```

#### Delete User
```typescript
const userId = 'user123';
await apiClient.deleteUser(userId);
console.log('User deleted');
```

---

### 3. Role Applications (Admin)

#### Get All Applications
```typescript
// Get all pending applications
const pending = await apiClient.getAllApplications({
  status: 'PENDING',
  page: 1,
  limit: 10
});

console.log(`Found ${pending.pagination.total} pending applications`);

pending.data.forEach(app => {
  console.log(`${app.user.fullName} wants to be ${app.role}`);
  console.log(`  Email: ${app.user.email}`);
  console.log(`  Bio: ${app.bio}`);
  console.log(`  Submitted: ${new Date(app.createdAt).toLocaleDateString()}`);
});

// Get all applications (no filter)
const all = await apiClient.getAllApplications();

// Get approved applications
const approved = await apiClient.getAllApplications({ status: 'APPROVED' });
```

#### Get Single Application Details
```typescript
const appId = 'cml6t15n90002bwbank1vpkto';
const application = await apiClient.getApplicationById(appId);

console.log('Application:', application.data);
console.log('Applicant:', application.data.user);
console.log('Status:', application.data.status);
console.log('Portfolio:', application.data.portfolioUrl);
```

#### Approve Application
```typescript
const appId = 'cml6t15n90002bwbank1vpkto';

try {
  const response = await apiClient.approveApplication(appId);
  console.log('Application approved!');
  console.log('Updated status:', response.data.status);
  console.log('User role automatically updated to:', response.data.role);
} catch (error) {
  console.error('Failed to approve:', error.message);
}
```

#### Reject Application
```typescript
const appId = 'cml6t15n90002bwbank1vpkto';
const reason = 'Insufficient documentation. Please provide valid proof of professional experience.';

try {
  const response = await apiClient.rejectApplication(appId, reason);
  console.log('Application rejected');
  console.log('Reason:', response.data.notes);
} catch (error) {
  console.error('Failed to reject:', error.message);
}
```

---

### 4. Role Applications (User)

#### Submit Application
```typescript
// Without file
const application = await apiClient.submitRoleApplication({
  role: 'ARTIST',
  bio: 'Professional Kandyan dancer with 10 years experience',
  portfolioUrl: 'https://myportfolio.com'
});

console.log('Application submitted:', application.id);

// With file upload
const fileInput = document.querySelector('#proofDocument') as HTMLInputElement;
const file = fileInput.files?.[0];

if (file) {
  const application = await apiClient.submitRoleApplication({
    role: 'ORGANIZER',
    bio: 'Experienced event organizer',
    portfolioUrl: 'https://myportfolio.com',
    proofDocument: file
  });
  
  console.log('Application with document submitted:', application.id);
}
```

#### Get My Applications
```typescript
const myApps = await apiClient.getMyApplications();

console.log(`You have ${myApps.length} applications`);

myApps.forEach(app => {
  console.log(`${app.role}: ${app.status}`);
  if (app.status === 'REJECTED') {
    console.log(`  Reason: ${app.notes}`);
  }
});
```

---

## Complete Workflow Examples

### Admin Dashboard - Review Pending Applications

```typescript
import apiClient from './api-client';

async function reviewApplications() {
  try {
    // 1. Login as admin
    await apiClient.login({
      email: 'admin@example.com',
      password: 'admin123'
    });

    // 2. Get all pending applications
    const pending = await apiClient.getAllApplications({ status: 'PENDING' });
    
    console.log(`\n📋 ${pending.pagination.total} Pending Applications:\n`);

    // 3. Review each application
    for (const app of pending.data) {
      console.log(`\n👤 ${app.user.fullName} (${app.user.email})`);
      console.log(`   Applying for: ${app.role}`);
      console.log(`   Bio: ${app.bio}`);
      console.log(`   Portfolio: ${app.portfolioUrl}`);
      
      // Get detailed application info
      const details = await apiClient.getApplicationById(app.id);
      console.log(`   Phone: ${details.data.user.phone}`);
      console.log(`   City: ${details.data.user.city}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

reviewApplications();
```

### Admin - Approve/Reject Applications

```typescript
import apiClient from './api-client';

async function processApplication(applicationId: string, approve: boolean, rejectReason?: string) {
  try {
    if (approve) {
      const result = await apiClient.approveApplication(applicationId);
      console.log('✅ Application approved!');
      console.log(`   User role updated to: ${result.data.role}`);
    } else {
      if (!rejectReason) {
        throw new Error('Reject reason is required');
      }
      const result = await apiClient.rejectApplication(applicationId, rejectReason);
      console.log('❌ Application rejected');
      console.log(`   Reason: ${result.data.notes}`);
    }
  } catch (error) {
    console.error('Error processing application:', error.message);
  }
}

// Usage
const appId = 'cml6t15n90002bwbank1vpkto';

// Approve
await processApplication(appId, true);

// Reject
await processApplication(
  appId, 
  false, 
  'Insufficient experience documentation'
);
```

### User - Check Application Status

```typescript
import apiClient from './api-client';

async function checkMyApplicationStatus() {
  try {
    // Login
    await apiClient.login({
      email: 'user@example.com',
      password: 'password123'
    });

    // Get my applications
    const applications = await apiClient.getMyApplications();

    if (applications.length === 0) {
      console.log('You have no applications');
      return;
    }

    console.log('\n📝 Your Applications:\n');

    applications.forEach((app, index) => {
      console.log(`${index + 1}. ${app.role}`);
      console.log(`   Status: ${app.status}`);
      console.log(`   Submitted: ${new Date(app.createdAt).toLocaleDateString()}`);
      
      if (app.status === 'PENDING') {
        console.log('   ⏳ Pending review');
      } else if (app.status === 'APPROVED') {
        console.log('   ✅ Approved!');
      } else if (app.status === 'REJECTED') {
        console.log('   ❌ Rejected');
        console.log(`   Reason: ${app.notes}`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkMyApplicationStatus();
```

### User - Submit New Application

```typescript
import apiClient from './api-client';

async function submitApplication() {
  try {
    // Login
    await apiClient.login({
      email: 'user@example.com',
      password: 'password123'
    });

    // Submit application
    const application = await apiClient.submitRoleApplication({
      role: 'ARTIST',
      bio: 'Professional Kandyan dancer with 10 years experience in traditional Sri Lankan dance forms.',
      portfolioUrl: 'https://myportfolio.com'
    });

    console.log('✅ Application submitted successfully!');
    console.log(`   Application ID: ${application.id}`);
    console.log(`   Status: ${application.status}`);
    console.log('   You will be notified once your application is reviewed.');

  } catch (error) {
    console.error('Failed to submit application:', error.message);
  }
}

submitApplication();
```

---

## React/Next.js Integration Example

```typescript
// hooks/useApi.ts
import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';

export function useUsers(filters?: { role?: string; search?: string }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        const response = await apiClient.getUsers(filters);
        setUsers(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [filters]);

  return { users, loading, error };
}

// Component usage
function UserList() {
  const { users, loading, error } = useUsers({ role: 'USER' });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>
          {user.fullName} - {user.roleApplications.length} applications
        </li>
      ))}
    </ul>
  );
}
```

---

## Testing Example

```typescript
import apiClient from './api-client';

describe('Role Application API', () => {
  beforeAll(async () => {
    // Login before tests
    await apiClient.login({
      email: 'admin@test.com',
      password: 'test123'
    });
  });

  test('should get all users', async () => {
    const response = await apiClient.getUsers();
    expect(response.success).toBe(true);
    expect(Array.isArray(response.data)).toBe(true);
  });

  test('should get pending applications', async () => {
    const response = await apiClient.getAllApplications({ status: 'PENDING' });
    expect(response.success).toBe(true);
    expect(response.data.every(app => app.status === 'PENDING')).toBe(true);
  });

  test('should reject application with reason', async () => {
    const appId = 'test-app-id';
    const response = await apiClient.rejectApplication(
      appId,
      'Test rejection reason'
    );
    expect(response.data.status).toBe('REJECTED');
    expect(response.data.notes).toBe('Test rejection reason');
  });
});
```

---

## Error Handling

```typescript
import apiClient from './api-client';

async function safeApiCall() {
  try {
    const users = await apiClient.getUsers();
    return users;
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      console.log('Please login first');
      // Redirect to login page
    } else if (error.message.includes('403')) {
      console.log('Access denied - Admin role required');
    } else {
      console.error('API Error:', error.message);
    }
    throw error;
  }
}
```

---

## Tips

1. **Always set token after login:**
   ```typescript
   const response = await apiClient.login({ email, password });
   // Token is automatically set
   ```

2. **Check token before making authenticated calls:**
   ```typescript
   if (!apiClient.getToken()) {
     console.log('Please login first');
     return;
   }
   ```

3. **Handle pagination:**
   ```typescript
   let page = 1;
   let hasMore = true;
   
   while (hasMore) {
     const response = await apiClient.getUsers({ page, limit: 20 });
     // Process users
     hasMore = page < response.pagination.totalPages;
     page++;
   }
   ```

4. **Custom base URL for different environments:**
   ```typescript
   const apiClient = new ApiClient(
     process.env.NODE_ENV === 'production'
       ? 'https://api.production.com'
       : 'http://localhost:3001'
   );
   ```

---

This API client makes it easy to call all endpoints from a single, centralized location!
