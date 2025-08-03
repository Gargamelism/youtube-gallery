import React, { useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Upload } from 'lucide-react';

const Header = ({ onVideosUpdate, onLoadingUpdate }) => {

    const handleFileUpload = useCallback(async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        onLoadingUpdate(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            // Map the data to our expected format
            const mappedVideos = jsonData.map((row, index) => ({
                id: index,
                title: row['Title'] || '',
                description: row['Description'] || '',
                duration: row['Duration'] || '',
                publishedAt: row['Published At'] || '',
                tags: row['Tags'] || '',
                thumbnailPath: row['Thumbnail Path'] || '',
                videoUrl: row['Video URL'] || ''
            }));

            onVideosUpdate(mappedVideos);
        } catch (error) {
            console.error('Error reading Excel file:', error);
            alert('Error reading Excel file. Please make sure it has the correct format.');
        } finally {
            onLoadingUpdate(false);
        }
    }, [onVideosUpdate, onLoadingUpdate]);

    return (
        <header className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Video Gallery</h1>

            {/* File Upload */}
            <div className="bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300 p-8 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-lg font-medium text-gray-900">
                        Upload Excel File
                    </span>
                    <p className="text-gray-500 mt-2">
                        Select your Excel file with video data (.xlsx or .xls)
                    </p>
                    <input
                        id="file-upload"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <div className="mt-4">
                        <span className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-block">
                            Choose File
                        </span>
                    </div>
                </label>

                <div className="mt-4 text-sm text-gray-600">
                    <p>Required columns: Title, Description, Duration, Published At, Tags, Thumbnail Path, Video URL</p>
                </div>
            </div>
        </header>
    );
};

export default Header;