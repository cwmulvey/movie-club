import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import axios from 'axios';

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

interface UpdateProfileData {
  firstName: string;
  lastName: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting }
  } = useForm<UpdateProfileData>({
    defaultValues: {
      firstName: user?.profile?.firstName || '',
      lastName: user?.profile?.lastName || ''
    }
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    watch,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting }
  } = useForm<ChangePasswordData>();

  const newPassword = watch('newPassword');

  const onProfileSubmit = async (data: UpdateProfileData) => {
    try {
      setMessage(null);
      await axios.put(`${API_URL}/api/auth/profile`, data);
      await refreshUser(); // Refresh user data to show updated name in navbar
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error?.message || 'Failed to update profile' 
      });
    }
  };

  const onPasswordSubmit = async (data: ChangePasswordData) => {
    try {
      setMessage(null);
      await axios.put(`${API_URL}/api/auth/change-password`, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      resetPasswordForm();
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error?.message || 'Failed to change password' 
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage your account settings and preferences
            </p>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Profile Information
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'password'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Change Password
              </button>
            </nav>
          </div>

          <div className="p-6">
            {message && (
              <div className={`mb-6 rounded-md p-4 ${
                message.type === 'success' ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <div className={`text-sm ${
                  message.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {message.text}
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
                  
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                        First Name
                      </label>
                      <input
                        {...registerProfile('firstName', { required: 'First name is required' })}
                        type="text"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      {profileErrors.firstName && (
                        <p className="mt-1 text-sm text-red-600">{profileErrors.firstName.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                        Last Name
                      </label>
                      <input
                        {...registerProfile('lastName', { required: 'Last name is required' })}
                        type="text"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      {profileErrors.lastName && (
                        <p className="mt-1 text-sm text-red-600">{profileErrors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={user?.email}
                      disabled
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                    <p className="mt-1 text-sm text-gray-500">Email address cannot be changed</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isProfileSubmitting}
                    className="bg-indigo-600 border border-transparent rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {isProfileSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'password' && (
              <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                        Current Password
                      </label>
                      <input
                        {...registerPassword('currentPassword', { required: 'Current password is required' })}
                        type="password"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      {passwordErrors.currentPassword && (
                        <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                        New Password
                      </label>
                      <input
                        {...registerPassword('newPassword', {
                          required: 'New password is required',
                          minLength: { value: 8, message: 'Password must be at least 8 characters' },
                          pattern: {
                            value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                            message: 'Password must contain uppercase, lowercase, and number'
                          }
                        })}
                        type="password"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      {passwordErrors.newPassword && (
                        <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700">
                        Confirm New Password
                      </label>
                      <input
                        {...registerPassword('confirmNewPassword', {
                          required: 'Please confirm your new password',
                          validate: value => value === newPassword || 'Passwords do not match'
                        })}
                        type="password"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      {passwordErrors.confirmNewPassword && (
                        <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmNewPassword.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isPasswordSubmitting}
                    className="bg-indigo-600 border border-transparent rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {isPasswordSubmitting ? 'Changing Password...' : 'Change Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}