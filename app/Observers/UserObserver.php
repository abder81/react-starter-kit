<?php

namespace App\Observers;

use App\Models\User;
use App\Models\Folder;
use Illuminate\Support\Facades\DB;

class UserObserver
{
    /**
     * Handle the User "created" event.
     */
    public function created(User $user): void
    {
        // Skip if user is admin
        if ($user->is_admin) {
            return;
        }

        // Get all folders that are NOT confidential (level 5)
        // Or if you have a specific type/level for confidential folders
        $folders = Folder::where('level', '!=', 5) // Assuming level 5 is confidential
        ->orWhere(function($query) {
            $query->where('level', 5)
                ->whereNotIn('name', ['Confidentiel', 'Strictement Confidentiel']);
        })
        ->get();

        // Prepare the data for bulk insert
        $data = $folders->map(function ($folder) use ($user) {
            return [
                'user_id' => $user->id,
                'folder_id' => $folder->id,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        })->toArray();

        // Bulk insert the permissions
        if (!empty($data)) {
            DB::table('folder_user_pivot')->insert($data);
        }
    }

    /**
     * Handle the User "updated" event.
     */
    public function updated(User $user): void
    {
        //
    }

    /**
     * Handle the User "deleted" event.
     */
    public function deleted(User $user): void
    {
        //
    }

    /**
     * Handle the User "restored" event.
     */
    public function restored(User $user): void
    {
        //
    }

    /**
     * Handle the User "force deleted" event.
     */
    public function forceDeleted(User $user): void
    {
        //
    }
}
