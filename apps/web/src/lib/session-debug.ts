/**
 * Session Debug Utility
 * Use this to troubleshoot authentication issues
 */

import { getSession } from 'next-auth/react';

export async function debugSession() {
  try {
    console.log('=== Session Debug ===');
    const session = await getSession() as any;
    
    console.log('✓ getSession() completed');
    console.log('Session object:', session);
    console.log('User:', session?.user);
    console.log('Access Token present:', !!session?.accessToken);
    console.log('Access Token length:', session?.accessToken?.length || 0);
    console.log('User role:', session?.user?.role);
    console.log('User ID:', session?.user?.id);
    
    return {
      hasSession: !!session,
      hasToken: !!session?.accessToken,
      tokenLength: session?.accessToken?.length || 0,
      userRole: session?.user?.role,
      isAdmin: session?.user?.role === 'ADMIN',
    };
  } catch (error) {
    console.error('❌ Error debugging session:', error);
    return { error: String(error) };
  }
}

export async function testUploadAuth() {
  try {
    console.log('=== Testing Upload Authentication ===');
    const session = await getSession() as any;
    
    if (!session?.accessToken) {
      console.error('❌ No access token found');
      return { success: false, error: 'No access token' };
    }
    
    // Test a simple auth request
    const response = await fetch('http://localhost:4000/api/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
      },
    });
    
    console.log('Auth test response status:', response.status);
    const data = await response.json();
    console.log('Auth test response:', data);
    
    return {
      success: response.ok,
      status: response.status,
      data,
    };
  } catch (error) {
    console.error('❌ Error testing upload auth:', error);
    return { success: false, error: String(error) };
  }
}
