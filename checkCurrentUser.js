// Run this in browser console to check current user role

const token = localStorage.getItem('rasas_token');

if (!token) {
  console.log('❌ No token found - Please login');
} else {
  try {
    const decoded = JSON.parse(atob(token.split('.')[1]));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 Current User Info:');
    console.log('   Email:', decoded.email);
    console.log('   Name:', decoded.fullName);
    console.log('   Role:', decoded.role);
    console.log('   User ID:', decoded.id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (decoded.role === 'ADMIN') {
      console.log('✅ You have ADMIN access - Can approve requests');
    } else {
      console.log('❌ You need ADMIN role - Current role:', decoded.role);
      console.log('👉 Please logout and login as: rasaya@123');
    }
  } catch (e) {
    console.log('❌ Invalid token format');
  }
}
