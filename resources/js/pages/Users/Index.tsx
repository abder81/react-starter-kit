import { Head, Link, router, usePage } from '@inertiajs/react';
import { PlusIcon, PencilIcon, EyeIcon, TrashIcon } from '@heroicons/react/24/outline';
import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Utilisateurs',
        href: '/users',
    },
];

interface User {
    id: number;
    name: string;
    email: string;
    service: string | null;
    is_admin: boolean;
    created_at: string;
}

interface Paginator<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    next_page_url: string | null;
    prev_page_url: string | null;
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
}

interface PageProps {
    users: Paginator<User>;
    flash?: {
        success?: string;
        error?: string;
    };
    [key: string]: any;
}

export default function Index() {
    const { users, flash } = usePage<PageProps>().props;
    const [deleteLoading, setDeleteLoading] = useState<number | null>(null);

    const handleDelete = async (userId: number, userName: string) => {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${userName}" ?`)) {
            return;
        }

        setDeleteLoading(userId);
        
        router.delete(`/users/${userId}`, {
            onFinish: () => setDeleteLoading(null),
            onError: () => {
                alert('Erreur lors de la suppression de l\'utilisateur');
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gestion des Utilisateurs" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="sm:flex sm:items-center sm:justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Gérez tous les utilisateurs de votre application
                        </p>
                    </div>
                    <div className="mt-4 sm:mt-0">
                        <Link
                            href="/users/create"
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                        >
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Créer un utilisateur
                        </Link>
                    </div>
                </div>

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-green-800">{flash.success}</p>
                            </div>
                        </div>
                    </div>
                )}

                {flash?.error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-red-800">{flash.error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Users Table */}
                <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                    {users.data.length === 0 ? (
                        <div className="text-center py-12">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun utilisateur</h3>
                            <p className="mt-1 text-sm text-gray-500">Commencez en créant votre premier utilisateur.</p>
                            <div className="mt-6">
                                <Link
                                    href="/users/create"
                                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    <PlusIcon className="w-4 h-4 mr-2" />
                                    Créer un utilisateur
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Utilisateur
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Email
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Service
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Statut
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {users.data.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-150">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                                            <span className="text-sm font-medium text-gray-700">
                                                                {user.name.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {user.name}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            ID: {user.id}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{user.email}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                    {user.service || 'Non défini'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    user.is_admin 
                                                        ? 'bg-purple-100 text-purple-800' 
                                                        : 'bg-green-100 text-green-800'
                                                }`}>
                                                    {user.is_admin ? 'Administrateur' : 'Utilisateur'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <Link
                                                        href={`/users/${user.id}`}
                                                        className="inline-flex items-center p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                                                        title="Voir"
                                                    >
                                                        <EyeIcon className="w-4 h-4" />
                                                    </Link>
                                                    
                                                    <Link
                                                        href={`/users/${user.id}/edit`}
                                                        className="inline-flex items-center p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
                                                        title="Modifier"
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                    </Link>
                                                    
                                                    <button
                                                        onClick={() => handleDelete(user.id, user.name)}
                                                        disabled={deleteLoading === user.id}
                                                        className="inline-flex items-center p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="Supprimer"
                                                    >
                                                        {deleteLoading === user.id ? (
                                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                                            </svg>
                                                        ) : (
                                                            <TrashIcon className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination Controls */}
                {users.last_page > 1 && (
                    <div className="mt-4 flex items-center justify-center space-x-1">
                        {users.links.map((link, idx) => (
                            <button
                                key={idx}
                                disabled={!link.url}
                                onClick={() => link.url && router.visit(link.url)}
                                className={`px-3 py-1 rounded ${link.active ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'} disabled:opacity-50`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}

                {/* Table Footer with Count */}
                {users.data.length > 0 && (
                    <div className="mt-4 flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                            Affichage de <span className="font-medium">{users.from}</span> à <span className="font-medium">{users.to}</span> sur <span className="font-medium">{users.total}</span> utilisateur(s)
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}