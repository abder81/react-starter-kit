<?php
// database/seeders/DocumentStructureSeeder.php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Folder;
use App\Models\Document;

class DocumentStructureSeeder extends Seeder
{
    private $docTypes = ['Procédure', 'Charte', 'Guide', 'Politique', 'Enregistrement'];
    private $confidentialityLevels = ['Interne', 'Public', 'Restreint', 'Confidentiel', 'Strictement Confidentiel'];
    private $categories = [
        'Pilotage (4)' => ['PSP-01', 'PSP-02', 'PSP-03: Piloter le SMQ et les connaissances', 'PSP-04'],
        'Réalisation (6)' => ['PSR-05', 'PSR-06', 'PSR-07', 'PSR-09'],
        'Support (7)' => ['PSS-11', 'PSS-13', 'PSS-15', 'PSS-17']
    ];

    public function run()
    {
        // Create root folders
        $originalFolder = Folder::create([
            'name' => 'Original',
            'full_path' => 'Original',
            'level' => 1,
            'type' => 'root',
            'is_protected' => true
        ]);

        $obsoleteFolder = Folder::create([
            'name' => 'Obsolete',
            'full_path' => 'Obsolete',
            'level' => 1,
            'type' => 'root',
            'is_protected' => true
        ]);

        // Create category folders under both Original and Obsolete
        foreach (['Original', 'Obsolete'] as $rootName) {
            $rootFolder = $rootName === 'Original' ? $originalFolder : $obsoleteFolder;
            
            foreach ($this->categories as $categoryName => $processes) {
                $categoryFolder = Folder::create([
                    'name' => $categoryName,
                    'full_path' => "{$rootName}/{$categoryName}",
                    'parent_id' => $rootFolder->id,
                    'level' => 2,
                    'type' => 'category',
                    'is_protected' => true
                ]);

                // Create process folders
                foreach ($processes as $processName) {
                    $processFolder = Folder::create([
                        'name' => $processName,
                        'full_path' => "{$rootName}/{$categoryName}/{$processName}",
                        'parent_id' => $categoryFolder->id,
                        'level' => 3,
                        'type' => 'process'
                    ]);

                    // Create document type folders
                    foreach ($this->docTypes as $docType) {
                        $docTypeFolder = Folder::create([
                            'name' => $docType,
                            'full_path' => "{$rootName}/{$categoryName}/{$processName}/{$docType}",
                            'parent_id' => $processFolder->id,
                            'level' => 4,
                            'type' => 'document_type'
                        ]);

                        // Create confidentiality level folders
                        foreach ($this->confidentialityLevels as $level) {
                            $levelFolder = Folder::create([
                                'name' => $level,
                                'full_path' => "{$rootName}/{$categoryName}/{$processName}/{$docType}/{$level}",
                                'parent_id' => $docTypeFolder->id,
                                'level' => 5,
                                'type' => 'confidentiality'
                            ]);

                            // Add sample documents only to Original folders
                            if ($rootName === 'Original') {
                                $this->createSampleDocuments($levelFolder);
                            }
                        }
                    }
                }
            }
        }
    }

    private function createSampleDocuments(Folder $folder)
    {
        $sampleDocs = [
            ['name' => 'Procedure_Qualite_v2.1.pdf', 'size' => 2500000],
            ['name' => 'Manuel_Formation.pdf', 'size' => 1800000],
            ['name' => 'Guide_Utilisateur.pdf', 'size' => 3200000],
            ['name' => 'Politique_Securite.pdf', 'size' => 1100000],
        ];

        foreach ($sampleDocs as $doc) {
            Document::create([
                'name' => $doc['name'],
                'original_name' => $doc['name'],
                'file_path' => 'documents/' . $doc['name'], // This would be the actual storage path
                'full_path' => $folder->full_path . '/' . $doc['name'],
                'folder_id' => $folder->id,
                'mime_type' => 'application/pdf',
                'size' => $doc['size'],
                'version' => '1.0',
                'status' => 'active'
            ]);
        }
    }
}