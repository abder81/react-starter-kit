<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        $users = User::select(['id', 'name', 'email', 'service', 'is_admin', 'created_at'])
            ->orderBy('id', 'asc')
            ->paginate(10);

        return Inertia::render('Users/Index', [
            'users' => $users
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): Response
    {
        $services = ['service1', 'service2', 'service3']; // You can move this to a config file

        return Inertia::render('Users/Create', [
            'services' => $services
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'service' => ['nullable', 'string', 'in:service1,service2,service3'],
            'is_admin' => ['boolean']
        ]);

        $validated['password'] = Hash::make($validated['password']);
        $validated['is_admin'] = $request->boolean('is_admin');

        User::create($validated);

        return redirect()->route('users.index')->with('success', 'Utilisateur créé avec succès.');
    }

    /**
     * Display the specified resource.
     */
    public function show(User $user): Response
    {
        return Inertia::render('Users/Show', [
            'user' => $user->only(['id', 'name', 'email', 'service', 'is_admin', 'created_at', 'updated_at'])
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(User $user): Response
    {
        $services = ['service1', 'service2', 'service3']; // You can move this to a config file

        return Inertia::render('Users/Edit', [
            'user' => $user->only(['id', 'name', 'email', 'service', 'is_admin']),
            'services' => $services
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'service' => ['nullable', 'string', 'in:service1,service2,service3'],
            'is_admin' => ['boolean']
        ]);

        // Only hash password if it's provided
        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $validated['is_admin'] = $request->boolean('is_admin');

        $user->update($validated);

        return redirect()->route('users.index')->with('success', 'Utilisateur mis à jour avec succès.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(User $user): RedirectResponse
    {
        try {
            // Prevent deletion of the last admin user
            if ($user->is_admin && User::where('is_admin', true)->count() <= 1) {
                return redirect()->route('users.index')->with('error', 'Impossible de supprimer le dernier administrateur.');
            }

            // Prevent users from deleting themselves
            if (Auth::id() === $user->id) {
                return redirect()->route('users.index')->with('error', 'Vous ne pouvez pas supprimer votre propre compte.');
            }

            $user->delete();

            return redirect()->route('users.index')->with('success', 'Utilisateur supprimé avec succès.');
        } catch (\Exception $e) {
            return redirect()->route('users.index')->with('error', 'Erreur lors de la suppression de l\'utilisateur.');
        }
    }

    /**
     * Bulk delete users
     */
    public function bulkDelete(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'user_ids' => ['required', 'array', 'min:1'],
            'user_ids.*' => ['exists:users,id']
        ]);

        $userIds = $validated['user_ids'];
        $currentUserId = Auth::id();

        // Remove current user from deletion list
        $userIds = array_filter($userIds, fn($id) => $id != $currentUserId);

        if (empty($userIds)) {
            return redirect()->route('users.index')->with('error', 'Aucun utilisateur sélectionné pour la suppression.');
        }

        // Check if we're trying to delete all admin users
        $adminCount = User::where('is_admin', true)->count();
        $adminToDeleteCount = User::whereIn('id', $userIds)->where('is_admin', true)->count();

        if ($adminToDeleteCount >= $adminCount) {
            return redirect()->route('users.index')->with('error', 'Impossible de supprimer tous les administrateurs.');
        }

        try {
            $deletedCount = User::whereIn('id', $userIds)->delete();
            
            return redirect()->route('users.index')->with('success', "{$deletedCount} utilisateur(s) supprimé(s) avec succès.");
        } catch (\Exception $e) {
            return redirect()->route('users.index')->with('error', 'Erreur lors de la suppression des utilisateurs.');
        }
    }

    /**
     * Toggle admin status for a user
     */
    public function toggleAdmin(User $user): RedirectResponse
    {
        try {
            // Prevent removing admin status from the last admin
            if ($user->is_admin && User::where('is_admin', true)->count() <= 1) {
                return redirect()->route('users.index')->with('error', 'Impossible de retirer les droits du dernier administrateur.');
            }

            $user->update(['is_admin' => !$user->is_admin]);

            $status = $user->is_admin ? 'administrateur' : 'utilisateur standard';
            
            return redirect()->route('users.index')->with('success', "L'utilisateur {$user->name} est maintenant {$status}.");
        } catch (\Exception $e) {
            return redirect()->route('users.index')->with('error', 'Erreur lors de la modification du statut.');
        }
    }
}