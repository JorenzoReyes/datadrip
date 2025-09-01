// Demo data seeder for testing the user management system
// This can be called from the browser console or a development page

import { User } from '../types/user';

export const seedDemoUsers = () => {
  const demoUsers: User[] = [
    {
      id: 'demo_user_1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      companyName: 'Tech Corp',
      role: 'user',
      status: 'active',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      lastLoginAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      createdBy: 'admin@example.com'
    },
    {
      id: 'demo_user_2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      companyName: 'Data Solutions Inc',
      role: 'user',
      status: 'active',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      lastLoginAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      createdBy: 'admin@example.com'
    },
    {
      id: 'demo_user_3',
      firstName: 'Mike',
      lastName: 'Johnson',
      email: 'mike.johnson@example.com',
      companyName: 'Analytics Pro',
      role: 'admin',
      status: 'active',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
      updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      lastLoginAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      createdBy: 'admin@example.com'
    },
    {
      id: 'demo_user_4',
      firstName: 'Sarah',
      lastName: 'Wilson',
      email: 'sarah.wilson@example.com',
      companyName: 'Cloud Systems',
      role: 'user',
      status: 'pending',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'admin@example.com'
    },
    {
      id: 'demo_user_5',
      firstName: 'David',
      lastName: 'Brown',
      email: 'david.brown@example.com',
      companyName: 'Enterprise Solutions',
      role: 'user',
      status: 'inactive',
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      lastLoginAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      createdBy: 'admin@example.com'
    }
  ];

  const demoAuditLogs = [
    {
      id: 'demo_log_1',
      action: 'create' as const,
      targetUserId: 'demo_user_1',
      targetUserEmail: 'john.doe@example.com',
      performedBy: 'admin@example.com',
      performedByEmail: 'admin@example.com',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      details: 'User account created with role: user'
    },
    {
      id: 'demo_log_2',
      action: 'update' as const,
      targetUserId: 'demo_user_2',
      targetUserEmail: 'jane.smith@example.com',
      performedBy: 'admin@example.com',
      performedByEmail: 'admin@example.com',
      timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      details: 'User details updated',
      changes: [
        {
          field: 'companyName',
          oldValue: 'Tech Solutions',
          newValue: 'Data Solutions Inc'
        }
      ]
    },
    {
      id: 'demo_log_3',
      action: 'deactivate' as const,
      targetUserId: 'demo_user_5',
      targetUserEmail: 'david.brown@example.com',
      performedBy: 'admin@example.com',
      performedByEmail: 'admin@example.com',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      details: 'User account deactivated'
    }
  ];

  // Store in localStorage
  localStorage.setItem('managedUsers', JSON.stringify(demoUsers));
  localStorage.setItem('userAuditLogs', JSON.stringify(demoAuditLogs));

  console.log('Demo data seeded successfully!');
  console.log('Users:', demoUsers.length);
  console.log('Audit logs:', demoAuditLogs.length);
  
  return { users: demoUsers, auditLogs: demoAuditLogs };
};

// Function to clear all demo data
export const clearDemoData = () => {
  localStorage.removeItem('managedUsers');
  localStorage.removeItem('userAuditLogs');
  localStorage.removeItem('userFilters');
  console.log('Demo data cleared successfully!');
};

// Functions are available for import and use in components
