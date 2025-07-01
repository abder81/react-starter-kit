import { Head, Link, usePage } from '@inertiajs/react';
import { UserIcon, EnvelopeIcon, BuildingOfficeIcon, ShieldCheckIcon, CalendarIcon, PencilIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Utilisateurs', href: '/users' },
    { title: 'Détails', href: '' },
];

interface PageProps {
    user: {
        id: number;
        name: string;
        email: string;
        service: string | null;
        is_admin: boolean;
        created_at: string;
        updated_at: string;
    };
    [key: string]: any;
}

export default function Show() {
    const { user } = usePage<PageProps>().props;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Utilisateur: ${user.name}`} />
            
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                                    <span className="text-xl font-semibold text-indigo-600">
                                        {user.name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <div className="ml-4">
                                <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                                <p className="mt-1 text-sm text-gray-600">
                                    Détails de l'utilisateur #{user.id}
                                </p>
                            </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center space-x-3">
                            <Link
                                href={`/users/${user.id}/edit`}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                            >
                                <PencilIcon className="w-4 h-4 mr-2" />
                                Modifier
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Main Content Card */}
                <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-6 py-6">
                        {/* User Status Badge */}
                        <div className="mb-6">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                user.is_admin 
                                    ? 'bg-purple-100 text-purple-800' 
                                    : 'bg-green-100 text-green-800'
                            }`}>
                                <ShieldCheckIcon className="w-4 h-4 mr-1.5" />
                                {user.is_admin ? 'Administrateur' : 'Utilisateur'}
                            </span>
                        </div>

                        {/* Information Grid */}
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            {/* Personal Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                    Informations personnelles
                                </h3>
                                
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <UserIcon className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <div className="ml-3">
                                        <dt className="text-sm font-medium text-gray-500">Nom complet</dt>
                                        <dd className="text-sm text-gray-900 mt-1">{user.name}</dd>
                                    </div>
                                </div>

                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <div className="ml-3">
                                        <dt className="text-sm font-medium text-gray-500">Adresse email</dt>
                                        <dd className="text-sm text-gray-900 mt-1">
                                            <a href={`mailto:${user.email}`} className="text-indigo-600 hover:text-indigo-500 transition-colors duration-200">
                                                {user.email}
                                            </a>
                                        </dd>
                                    </div>
                                </div>
                            </div>

                            {/* Organization Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                    Organisation
                                </h3>
                                
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <BuildingOfficeIcon className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <div className="ml-3">
                                        <dt className="text-sm font-medium text-gray-500">Service</dt>
                                        <dd className="text-sm text-gray-900 mt-1">
                                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                {user.service || 'Non défini'}
                                            </span>
                                        </dd>
                                    </div>
                                </div>

                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <ShieldCheckIcon className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <div className="ml-3">
                                        <dt className="text-sm font-medium text-gray-500">Permissions</dt>
                                        <dd className="text-sm text-gray-900 mt-1">
                                            {user.is_admin ? 'Accès administrateur complet' : 'Accès utilisateur standard'}
                                        </dd>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* System Information */}
                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                Informations système
                            </h3>
                            
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <CalendarIcon className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <div className="ml-3">
                                        <dt className="text-sm font-medium text-gray-500">Créé le</dt>
                                        <dd className="text-sm text-gray-900 mt-1">{formatDate(user.created_at)}</dd>
                                    </div>
                                </div>

                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <CalendarIcon className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <div className="ml-3">
                                        <dt className="text-sm font-medium text-gray-500">Dernière modification</dt>
                                        <dd className="text-sm text-gray-900 mt-1">{formatDate(user.updated_at)}</dd>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                        <Link 
                            href="/users" 
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                        >
                            <ArrowLeftIcon className="w-4 h-4 mr-2" />
                            Retour à la liste
                        </Link>

                        <div className="text-xs text-gray-500">
                            ID utilisateur: {user.id}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}