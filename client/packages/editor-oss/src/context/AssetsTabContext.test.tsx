import {render, renderHook, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import {showToast} from '../showToast';
import AssetsTabContextProvider, {AssetsTabContext, AssetType} from './AssetsTabContext';
import Ajax from '../utils/Ajax';
import {UploadUtils} from '../utils/UploadUtils';

// Mock dependencies
vi.mock('./UrlUtils', () => ({
    backendUrlFromPath: (path: string) => `http://localhost:2020${path}`,
}));

vi.mock('../showToast', () => ({
    showToast: vi.fn(),
}));

vi.mock('../utils/UploadUtils', () => ({
    UploadUtils: {
        batchUploadFiles: vi.fn(),
    },
}));

vi.mock('./AuthorizationContext', () => ({
    useAuthorizationContext: () => ({
        dbUser: { id: 'user123', name: 'Test User' },
    }),
}));

vi.mock('../utils/Ajax', () => ({
    default: {
        get: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock('three', async (importOriginal) => ({
    ...await importOriginal<typeof import('three')>(),
    Audio: vi.fn(),
    AudioListener: vi.fn(),
}));

const mockShowToast = showToast as any;
const mockUploadUtils = UploadUtils as any;
const mockAjax = Ajax as any;

// Test component to access context
const TestComponent = () => {
    const context = React.useContext(AssetsTabContext);

    return (
        <div>
            <div data-testid="context-available">{context ? 'available' : 'not available'}</div>
            <button
                onClick={() => context?.fetchAssets(AssetType.SOUNDS)}
                data-testid="fetch-assets"
            >
                Fetch Assets
            </button>
            <button
                onClick={() => context?.deleteAsset(AssetType.SOUNDS, 'asset123')}
                data-testid="delete-asset"
            >
                Delete Asset
            </button>
            <button
                onClick={() => context?.batchAudioUpload('library123')}
                data-testid="batch-upload"
            >
                Batch Upload
            </button>
        </div>
    );
};

describe.skip('AssetsTabContext', () => {
    let mockApp: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock global app
        mockApp = {
            on: vi.fn(),
            call: vi.fn(),
            editor: {
                sceneID: 'scene123',
            },
        };

        (global as any).app = mockApp;

        // Setup default mocks
        mockAjax.get.mockResolvedValue({
            data: { Code: 200, Data: [] },
        });

        mockAjax.delete.mockResolvedValue({
            data: { Code: 200 },
        });

        mockUploadUtils.batchUploadFiles.mockResolvedValue({
            successful: [{ id: 'success1' }],
            failed: [],
        });

        // Mock document methods
        global.document.createElement = vi.fn().mockImplementation((tag: string) => {
            if (tag === 'input') {
                return {
                    type: '',
                    style: { display: '' },
                    accept: '',
                    value: '',
                    files: null,
                    onchange: null,
                    click: vi.fn(),
                };
            }
            return {};
        });

        global.document.body.appendChild = vi.fn();
        global.document.body.removeChild = vi.fn();
    });

    describe('Provider', () => {
        it('should provide context to children', () => {
            const { result } = renderHook(() => React.useContext(AssetsTabContext), {
                wrapper: AssetsTabContextProvider,
            });

            expect(result.current).toBeDefined();
            expect(result.current?.fetchAssets).toBeDefined();
            expect(result.current?.deleteAsset).toBeDefined();
            expect(result.current?.batchAudioUpload).toBeDefined();
            expect((result.current as any)?.addAssets).toBeDefined();
        });

        it('should register app event listeners on mount', () => {
            renderHook(() => React.useContext(AssetsTabContext), {
                wrapper: AssetsTabContextProvider,
            });

            expect(mockApp.on).toHaveBeenCalledWith(
                'fetchAudio.AssetsTabContextProvider',
                expect.any(Function),
            );
        });

        it('should call fetchAssets when app event is triggered', () => {
            mockAjax.get.mockResolvedValue({
                data: { Code: 200, Data: [{ id: 'audio1', name: 'test.mp3' }] },
            });

            render(
                <AssetsTabContextProvider>
                    <TestComponent />
                </AssetsTabContextProvider>,
            );

            // Get the callback function passed to app.on
            const fetchAudioCallback = mockApp.on.mock.calls.find(
                (call: any[]) => call[0] === 'fetchAudio.AssetsTabContextProvider',
            )?.[1];

            // Execute the callback
            if (fetchAudioCallback) {
                fetchAudioCallback();
            }

            expect(mockAjax.get).toHaveBeenCalledWith({
                url: 'http://localhost:2020/api/SOUNDS/GetList?LibraryID=',
            });
        });
    });

    describe('fetchAssets', () => {
        it('should fetch assets successfully', async () => {
            const mockAssets = [
                { id: 'asset1', name: 'test1.mp3' },
                { id: 'asset2', name: 'test2.mp3' },
            ];

            mockAjax.get.mockResolvedValue({
                data: { Code: 200, Data: mockAssets },
            });

            render(
                <AssetsTabContextProvider>
                    <TestComponent />
                </AssetsTabContextProvider>,
            );

            const fetchButton = screen.getByTestId('fetch-assets');
            await userEvent.click(fetchButton);

            await waitFor(() => {
                expect(mockAjax.get).toHaveBeenCalledWith({
                    url: 'http://localhost:2020/api/SOUNDS/GetList?LibraryID=',
                });
            });
        });

        it('should handle fetch errors', async () => {
            mockAjax.get.mockResolvedValue({
                data: { Code: 400, Msg: 'Fetch failed' },
            });

            render(
                <AssetsTabContextProvider>
                    <TestComponent />
                </AssetsTabContextProvider>,
            );

            const fetchButton = screen.getByTestId('fetch-assets');
            await userEvent.click(fetchButton);

            await waitFor(() => {
                expect(mockShowToast).toHaveBeenCalledWith({
                    type: 'error',
                    body: 'Fetch failed',
                });
            });
        });

        it('should handle network errors', async () => {
            mockAjax.get.mockRejectedValue(new Error('Network error'));

            render(
                <AssetsTabContextProvider>
                    <TestComponent />
                </AssetsTabContextProvider>,
            );

            const fetchButton = screen.getByTestId('fetch-assets');
            await userEvent.click(fetchButton);

            await waitFor(() => {
                expect(mockShowToast).toHaveBeenCalledWith({
                    type: 'error',
                    body: 'Failed to fetch assets',
                });
            });
        });
    });

    describe('deleteAsset', () => {
        it('should delete asset successfully', async () => {
            mockAjax.delete.mockResolvedValue({
                data: { Code: 200 },
            });

            render(
                <AssetsTabContextProvider>
                    <TestComponent />
                </AssetsTabContextProvider>,
            );

            const deleteButton = screen.getByTestId('delete-asset');
            await userEvent.click(deleteButton);

            await waitFor(() => {
                expect(mockAjax.delete).toHaveBeenCalledWith({
                    url: 'http://localhost:2020/api/SOUNDS/Delete/asset123',
                });
            });

            expect(mockShowToast).toHaveBeenCalledWith({
                type: 'success',
                body: 'Asset deleted successfully',
            });
        });

        it('should handle delete errors', async () => {
            mockAjax.delete.mockResolvedValue({
                data: { Code: 400, Msg: 'Delete failed' },
            });

            render(
                <AssetsTabContextProvider>
                    <TestComponent />
                </AssetsTabContextProvider>,
            );

            const deleteButton = screen.getByTestId('delete-asset');
            await userEvent.click(deleteButton);

            await waitFor(() => {
                expect(mockShowToast).toHaveBeenCalledWith({
                    type: 'error',
                    body: 'Delete failed',
                });
            });
        });

        it('should handle network errors during delete', async () => {
            mockAjax.delete.mockRejectedValue(new Error('Network error'));

            render(
                <AssetsTabContextProvider>
                    <TestComponent />
                </AssetsTabContextProvider>,
            );

            const deleteButton = screen.getByTestId('delete-asset');
            await userEvent.click(deleteButton);

            await waitFor(() => {
                expect(mockShowToast).toHaveBeenCalledWith({
                    type: 'error',
                    body: 'Failed to delete asset',
                });
            });
        });
    });

    describe('batchAudioUpload', () => {
        it('should perform batch upload successfully', async () => {
            mockUploadUtils.batchUploadFiles.mockResolvedValue({
                successful: [
                    { id: 'success1' },
                    { id: 'success2' },
                ],
                failed: [],
            });

            render(
                <AssetsTabContextProvider>
                    <TestComponent />
                </AssetsTabContextProvider>,
            );

            const uploadButton = screen.getByTestId('batch-upload');
            await userEvent.click(uploadButton);

            await waitFor(() => {
                expect(mockUploadUtils.batchUploadFiles).toHaveBeenCalledWith(
                    expect.any(Array),
                    '/api/SOUNDS/Add',
                    expect.any(Function),
                    undefined,
                    'library123',
                    4,
                );
            });

            expect(mockShowToast).toHaveBeenCalledWith({
                type: 'info',
                title: 'Uploading 1 audio files...',
                body: 'Processing in batches of 4 for optimal performance',
                autoClose: 3000,
            });

            expect(mockShowToast).toHaveBeenCalledWith({
                type: 'success',
                title: 'Successfully uploaded 2 audio files',
                autoClose: 3000,
            });
        });

        it('should handle upload failures', async () => {
            mockUploadUtils.batchUploadFiles.mockResolvedValue({
                successful: [{ id: 'success1' }],
                failed: [
                    { file: new File(['test'], 'fail1.mp3'), error: new Error('Upload failed') },
                    { file: new File(['test'], 'fail2.mp3'), error: new Error('Upload failed') },
                ],
            });

            render(
                <AssetsTabContextProvider>
                    <TestComponent />
                </AssetsTabContextProvider>,
            );

            const uploadButton = screen.getByTestId('batch-upload');
            await userEvent.click(uploadButton);

            await waitFor(() => {
                expect(mockShowToast).toHaveBeenCalledWith({
                    type: 'warning',
                    title: '2 uploads failed',
                    body: 'fail1.mp3, fail2.mp3',
                    autoClose: 5000,
                });
            });
        });

        it('should handle batch upload errors', async () => {
            mockUploadUtils.batchUploadFiles.mockRejectedValue(new Error('Batch upload failed'));

            render(
                <AssetsTabContextProvider>
                    <TestComponent />
                </AssetsTabContextProvider>,
            );

            const uploadButton = screen.getByTestId('batch-upload');
            await userEvent.click(uploadButton);

            await waitFor(() => {
                expect(mockShowToast).toHaveBeenCalledWith({
                    type: 'error',
                    body: 'Batch upload failed. Please try again.',
                });
            });
        });

        it('should handle empty file list', async () => {
            // Mock document.createElement to return an input with no files
            const mockInput = {
                type: '',
                style: { display: '' },
                accept: '',
                value: '',
                files: [],
                onchange: null,
                click: vi.fn(),
            };
            global.document.createElement = vi.fn().mockReturnValue(mockInput);

            render(
                <AssetsTabContextProvider>
                    <TestComponent />
                </AssetsTabContextProvider>,
            );

            const uploadButton = screen.getByTestId('batch-upload');
            await userEvent.click(uploadButton);

            // Should call click to open file dialog
            expect(mockInput.click).toHaveBeenCalled();
        });

        it('should call app methods after successful upload', async () => {
            mockUploadUtils.batchUploadFiles.mockResolvedValue({
                successful: [{ id: 'success1' }],
                failed: [],
            });

            render(
                <AssetsTabContextProvider>
                    <TestComponent />
                </AssetsTabContextProvider>,
            );

            const uploadButton = screen.getByTestId('batch-upload');
            await userEvent.click(uploadButton);

            await waitFor(() => {
                expect(mockApp.call).toHaveBeenCalledWith('finishedModelUpload');
                expect(mockApp.call).toHaveBeenCalledWith('fetchAudio');
            });
        });

        it('should show progress updates during upload', async () => {
            let progressCallback: any;

            mockUploadUtils.batchUploadFiles.mockImplementation((files: any, url: any, callback: any) => {
                progressCallback = callback;
                return Promise.resolve({
                    successful: [{ id: 'success1' }],
                    failed: [],
                });
            });

            render(
                <AssetsTabContextProvider>
                    <TestComponent />
                </AssetsTabContextProvider>,
            );

            const uploadButton = screen.getByTestId('batch-upload');
            await userEvent.click(uploadButton);

            await waitFor(() => {
                expect(progressCallback).toBeDefined();
            });

            // Simulate progress updates
            if (progressCallback) {
                progressCallback(4, 8, []); // Every 4th update should show toast

                expect(mockShowToast).toHaveBeenCalledWith({
                    type: 'info',
                    title: 'Progress: 4/8 files uploaded',
                    body: 'Upload proceeding...',
                    autoClose: 2000,
                });
            }
        });
    });

    describe('addAssets', () => {
        it('should provide addAssets function in context', () => {
            const TestAddAssets = () => {
                const context = React.useContext(AssetsTabContext);
                return (
                    <div>
                        <div data-testid="add-assets-available">
                            {(context as any)?.addAssets ? 'available' : 'not available'}
                        </div>
                    </div>
                );
            };

            render(
                <AssetsTabContextProvider>
                    <TestAddAssets />
                </AssetsTabContextProvider>,
            );

            expect(screen.getByTestId('add-assets-available')).toHaveTextContent('available');
        });
    });

    describe('Edge cases', () => {
        it('should handle missing global app', () => {
            (global as any).app = undefined;

            expect(() => {
                render(
                    <AssetsTabContextProvider>
                        <TestComponent />
                    </AssetsTabContextProvider>,
                );
            }).not.toThrow();
        });

        it('should handle missing editor in app', () => {
            (global as any).app = { on: vi.fn(), call: vi.fn() };

            render(
                <AssetsTabContextProvider>
                    <TestComponent />
                </AssetsTabContextProvider>,
            );

            expect(screen.getByTestId('context-available')).toHaveTextContent('available');
        });
    });
});
