import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const LOGO_STYLES = [
    'Minimalist', 'Modern', 'Vintage', 'Playful', 'Elegant', 
    'Geometric', 'Abstract', 'Typographic', 'Illustrative', 
    'Hand-drawn', 'Flat Design', '3D'
];

const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'];
const IMAGE_SIZES = ['1K', '2K', '4K'];
const STORAGE_KEY = 'logoPromptEngineerState';

// Refined and more distinct SVG icons for logo styles
const styleIcons: Record<string, React.ReactNode> = {
    'Minimalist': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="8" x2="18" y2="8"></line><line x1="6" y1="16" x2="14" y2="16"></line></svg>,
    'Modern': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l4-4 4 4M7 4v16M21 16l-4 4-4-4M17 20V4"/></svg>,
    'Vintage': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
    'Playful': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>,
    'Elegant': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 18c4-10 14-8 14-8"/></svg>,
    'Geometric': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l-7 7 7 7 7-7-7-7z"/><circle cx="12" cy="12" r="3"/></svg>,
    'Abstract': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.2 14.2c.9 2.4 3.1 4 5.8 4 3.3 0 6-2.7 6-6s-2.7-6-6-6c-2.4 0-4.5 1.3-5.5 3.2"></path><path d="M21.8 9.8c-.9-2.4-3.1-4-5.8-4-3.3 0-6 2.7-6 6s2.7 6 6 6c2.4 0 4.5-1.3 5.5-3.2"></path></svg>,
    'Typographic': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V5h16v2"/><path d="M12 5v14"/><path d="M8 19h8"/></svg>,
    'Illustrative': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8"/><circle cx="6" cy="6" r="3"/></svg>,
    'Hand-drawn': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15.4 3.6A9 9 0 0120.4 15a9 9 0 01-14.8 4.4 9 9 0 01-1-11.8 9 9 0 0110.8-4z"/></svg>,
    'Flat Design': <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v16H4z"/></svg>,
    '3D': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05"/><path d="M12 22.08V12"/></svg>,
};

interface FormDataState {
    brandName: string;
    industry: string;
    visuals: string;
    colors: string;
    logoText: string;
}

interface AppState {
    formData: FormDataState;
    selectedStyles: string[];
    aspectRatio: string;
    imageSize: string;
    activeTab: 'create' | 'analyze';
}

interface Edits {
    brightness: number;
    contrast: number;
    saturation: number;
    hue: number;
    grayscale: number;
}

const initialEdits: Edits = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    grayscale: 0,
};

const defaultState: AppState = {
    formData: { brandName: '', industry: '', visuals: '', colors: '', logoText: '' },
    selectedStyles: [],
    aspectRatio: '1:1',
    imageSize: '1K',
    activeTab: 'create',
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error("Failed to convert file to base64"));
            }
        };
        reader.onerror = error => reject(error);
    });
};

const App = () => {
    // Centralized state with lazy initialization to read from localStorage only on first render
    const [appState, setAppState] = useState<AppState>(() => {
        try {
            const savedState = localStorage.getItem(STORAGE_KEY);
            if (savedState) {
                const parsedState = JSON.parse(savedState);
                return {
                    ...defaultState,
                    ...parsedState,
                    formData: {
                        ...defaultState.formData,
                        ...(parsedState.formData || {}),
                    },
                };
            }
        } catch (error) {
            console.error("Failed to load state from local storage:", error);
        }
        return defaultState;
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [images, setImages] = useState<string[]>([]);
    const [generatedPrompt, setGeneratedPrompt] = useState('');
    
    // State for the image editor
    const [editingImage, setEditingImage] = useState<{ src: string; index: number } | null>(null);
    const [edits, setEdits] = useState<Edits>(initialEdits);
    const [editHistory, setEditHistory] = useState<Edits[]>([]);
    const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // AI Edit State
    const [aiEditPrompt, setAiEditPrompt] = useState('');
    const [aiEditing, setAiEditing] = useState(false);

    // Analysis State
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [analyzedImage, setAnalyzedImage] = useState<string | null>(null);

    // Save state to local storage on any change to the centralized appState
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    }, [appState]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setAppState(prev => ({
            ...prev,
            formData: { ...prev.formData, [name]: value },
        }));
    };

    const toggleStyle = (style: string) => {
        setAppState(prev => {
            const { selectedStyles } = prev;
            const newStyles = selectedStyles.includes(style)
                ? selectedStyles.filter(s => s !== style)
                : (selectedStyles.length < 3 ? [...selectedStyles, style] : selectedStyles);
            return { ...prev, selectedStyles: newStyles };
        });
    };
    
    const handleAspectRatioChange = (ratio: string) => {
        setAppState(prev => ({ ...prev, aspectRatio: ratio }));
    };

    const handleImageSizeChange = (size: string) => {
        setAppState(prev => ({ ...prev, imageSize: size }));
    };

    const handleTabChange = (tab: 'create' | 'analyze') => {
        setAppState(prev => ({ ...prev, activeTab: tab }));
    };

    const constructPrompt = useCallback(() => {
        const { formData, selectedStyles } = appState;
        let prompt = `Generate a high-quality, professional logo for a brand named "${formData.brandName}".`;

        if (selectedStyles.length > 0) {
            prompt += ` The logo style must be a blend of: ${selectedStyles.join(', ')}.`;
        }
        if (formData.industry) {
            prompt += ` The brand is in the ${formData.industry} industry.`;
        }
        if (formData.visuals) {
            prompt += ` Consider incorporating these visual elements or concepts: ${formData.visuals}.`;
        }
        if (formData.colors) {
            prompt += ` The preferred color palette is: ${formData.colors}.`;
        }
        if (formData.logoText) {
            prompt += ` The text to be included in the logo is: "${formData.logoText}". This could be the brand name, a tagline, or a caption. Ensure it is elegantly integrated into the design.`;
        }
        
        prompt += ` The final logo must be iconic, memorable, and presented on a solid, clean white background for maximum clarity.`;

        return prompt;
    }, [appState]);

    const handleGenerate = async () => {
        if (!appState.formData.brandName) {
            setError('Please enter a brand name to generate a logo.');
            return;
        }
        setLoading(true);
        setError(null);
        setImages([]);
        
        const prompt = constructPrompt();
        setGeneratedPrompt(prompt);

        try {
            // Using gemini-3-pro-image-preview (Nano Banana Pro)
            // It generates one image usually per request in the content parts. 
            // We can try to generate multiple by calling it multiple times in parallel if we want a grid.
            // Let's generate 2 images to be responsive but give options.
            const generateOne = async () => {
                 const response = await ai.models.generateContent({
                    model: 'gemini-3-pro-image-preview',
                    contents: {
                        parts: [{ text: prompt }]
                    },
                    config: {
                        imageConfig: {
                            aspectRatio: appState.aspectRatio,
                            imageSize: appState.imageSize, 
                        },
                    },
                });
                return response;
            }

            const responses = await Promise.all([generateOne(), generateOne()]);
            const newImages: string[] = [];

            responses.forEach(response => {
                if (response.candidates && response.candidates[0].content.parts) {
                    for (const part of response.candidates[0].content.parts) {
                        if (part.inlineData) {
                            newImages.push(part.inlineData.data);
                        }
                    }
                }
            });

            if (newImages.length > 0) {
                setImages(newImages);
            } else {
                setError('The API did not return any images. Please try refining your prompt.');
            }
        } catch (e) {
            console.error(e);
            let friendlyErrorMessage = 'An unexpected error occurred while generating the logo. Please try again later.';
            if (e instanceof Error) {
                const errorMessage = e.message.toLowerCase();
                if (errorMessage.includes('api key')) {
                    friendlyErrorMessage = 'Invalid API Key. Please ensure your API key is correctly configured.';
                } else if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
                    friendlyErrorMessage = 'You have exceeded the request limit. Please wait a while before trying again.';
                } else if (errorMessage.includes('blocked')) {
                    friendlyErrorMessage = 'Your prompt was blocked due to safety concerns. Please modify your prompt and try again.';
                }
            }
            setError(friendlyErrorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyzeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAnalyzing(true);
        setAnalysisResult(null);
        setError(null);

        try {
            const base64 = await fileToBase64(file);
            setAnalyzedImage(base64);

            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: {
                    parts: [
                        { inlineData: { mimeType: file.type, data: base64 } },
                        { text: "Analyze this logo design. Describe its style, colors, visual elements, and industry fit. Then, provide a detailed prompt that could be used to generate a similar logo." }
                    ]
                }
            });

            if (response.text) {
                setAnalysisResult(response.text);
            }
        } catch (err) {
            console.error(err);
            setError("Failed to analyze the image. Please try again.");
        } finally {
            setAnalyzing(false);
        }
    };
    
    const handleReset = () => {
        if (window.confirm("Are you sure you want to reset the form? All your inputs and generated images will be lost.")) {
            localStorage.removeItem(STORAGE_KEY);
            setAppState(defaultState);
            setImages([]);
            setError(null);
            setGeneratedPrompt('');
            setAnalysisResult(null);
            setAnalyzedImage(null);
        }
    };

    // Image Editor Functions
    const openEditor = (src: string, index: number) => {
        setEditingImage({ src, index });
        setEdits(initialEdits);
        setEditHistory([initialEdits]);
        setCurrentHistoryIndex(0);
        setAiEditPrompt('');
    };
    
    const applyCanvasFilters = useCallback(() => {
        if (editingImage && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.src = `data:image/jpeg;base64,${editingImage.src}`;
            img.onload = () => {
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                if (ctx) {
                    ctx.filter = `brightness(${edits.brightness}%) contrast(${edits.contrast}%) saturate(${edits.saturation}%) hue-rotate(${edits.hue}deg) grayscale(${edits.grayscale}%)`;
                    ctx.drawImage(img, 0, 0);
                }
            };
        }
    }, [editingImage, edits]);

    useEffect(() => {
        applyCanvasFilters();
    }, [applyCanvasFilters]);

    const handleAiEdit = async () => {
        if (!editingImage || !aiEditPrompt) return;
        setAiEditing(true);
        
        try {
            // Use Gemini 2.5 Flash Image for editing
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { mimeType: 'image/jpeg', data: editingImage.src } },
                        { text: aiEditPrompt }
                    ]
                }
            });

            let newImageData: string | null = null;
            if (response.candidates && response.candidates[0].content.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        newImageData = part.inlineData.data;
                        break;
                    }
                }
            }

            if (newImageData) {
                setEditingImage({ ...editingImage, src: newImageData });
                // Reset manual edits as we have a new base image
                setEdits(initialEdits);
                setEditHistory([initialEdits]);
                setCurrentHistoryIndex(0);
                setAiEditPrompt('');
            } else {
                alert("The AI couldn't perform the edit. Try a different prompt.");
            }

        } catch (e) {
            console.error(e);
            alert("Error performing AI edit.");
        } finally {
            setAiEditing(false);
        }
    };

    const handleDownloadEdited = () => {
        if (canvasRef.current && editingImage) {
            const canvas = canvasRef.current;
            const link = document.createElement('a');
            link.download = `${appState.formData.brandName.replace(/\s+/g, '_') || 'logo'}-${editingImage.index + 1}-edited.jpeg`;
            link.href = canvas.toDataURL('image/jpeg', 0.9);
            link.click();
        }
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEdits(prev => ({...prev, [name]: parseInt(value, 10)}));
    };
    
    const commitEdits = () => {
        const newHistory = editHistory.slice(0, currentHistoryIndex + 1);
        newHistory.push(edits);
        setEditHistory(newHistory);
        setCurrentHistoryIndex(newHistory.length - 1);
    };
    
    const handleUndo = () => {
        if (currentHistoryIndex > 0) {
            const newIndex = currentHistoryIndex - 1;
            setCurrentHistoryIndex(newIndex);
            setEdits(editHistory[newIndex]);
        }
    };

    const handleRedo = () => {
        if (currentHistoryIndex < editHistory.length - 1) {
            const newIndex = currentHistoryIndex + 1;
            setCurrentHistoryIndex(newIndex);
            setEdits(editHistory[newIndex]);
        }
    };

    const getAspectRatioStyles = (ratio: string): React.CSSProperties => {
        const [w, h] = ratio.split(':').map(Number);
        const BASE_HEIGHT = 30; // pixels
        return {
            width: `${(w / h) * BASE_HEIGHT}px`,
            height: `${BASE_HEIGHT}px`,
        };
    };

    const renderInputField = (name: keyof FormDataState, label: string, placeholder: string, isTextarea = false) => (
        <div className="form-group">
            <label htmlFor={name}>{label}</label>
            {isTextarea ? (
                <textarea
                    id={name}
                    name={name}
                    value={appState.formData[name]}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                />
            ) : (
                <input
                    type="text"
                    id={name}
                    name={name}
                    value={appState.formData[name]}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                />
            )}
        </div>
    );
    
    const renderRangeInput = (name: keyof Edits, label: string, min: number, max: number, unit: string) => (
         <div className="control-group">
            <label htmlFor={name}>{label}</label>
            <input 
                type="range" 
                id={name} 
                name={name} 
                min={min} 
                max={max} 
                value={edits[name]}
                onChange={handleEditChange}
                onMouseUp={commitEdits}
                onTouchEnd={commitEdits}
            />
            <span>{edits[name]}{unit}</span>
        </div>
    );

    return (
        <>
            <header>
                <h1>Brand Logo Prompt Engineer</h1>
                <p>Craft the perfect prompt, generate logos with AI, or analyze existing designs.</p>
            </header>
            <div className="tabs">
                <button 
                    className={`tab-button ${appState.activeTab === 'create' ? 'active' : ''}`}
                    onClick={() => handleTabChange('create')}
                >
                    Create Logo
                </button>
                <button 
                    className={`tab-button ${appState.activeTab === 'analyze' ? 'active' : ''}`}
                    onClick={() => handleTabChange('analyze')}
                >
                    Analyze Logo
                </button>
            </div>
            <main>
                {appState.activeTab === 'create' ? (
                    <>
                        <section className="form-section">
                            {renderInputField('brandName', '1. Brand Name', 'Your Brand\'s Name Here')}
                            {renderInputField('industry', '2. Industry/Niche', 'e.g., Artisan Coffee Roaster, Tech Startup')}
                            <div className="form-group">
                                <label>3. Desired Logo Style/Aesthetics <span>(Choose up to 3)</span></label>
                                <div className="style-options">
                                    {LOGO_STYLES.map(style => (
                                        <button
                                            key={style}
                                            className={`style-option ${appState.selectedStyles.includes(style) ? 'selected' : ''}`}
                                            onClick={() => toggleStyle(style)}
                                        >
                                            {styleIcons[style]}
                                            {style}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {renderInputField('visuals', '4. Key Visual Elements (Optional)', 'e.g., A subtle leaf, interlocking gears', true)}
                            {renderInputField('colors', '5. Preferred Color Palette (Optional)', 'e.g., Blues and greens for trust and growth', true)}
                            {renderInputField('logoText', '6. Logo Text: Brand Name & Captions', 'e.g., "Innovate" or "Innovate Forward"', true)}
                            
                            <div className="form-row" style={{ display: 'flex', gap: '2rem' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>7. Aspect Ratio</label>
                                    <div className="style-options aspect-ratios">
                                        {ASPECT_RATIOS.map(ratio => (
                                            <button
                                                key={ratio}
                                                className={`style-option aspect-ratio-button ${appState.aspectRatio === ratio ? 'selected' : ''}`}
                                                onClick={() => handleAspectRatioChange(ratio)}
                                            >
                                                <div className="aspect-ratio-preview" style={getAspectRatioStyles(ratio)}></div>
                                                <span>{ratio}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>8. Image Size</label>
                                    <div className="style-options aspect-ratios">
                                        {IMAGE_SIZES.map(size => (
                                            <button
                                                key={size}
                                                className={`style-option aspect-ratio-button ${appState.imageSize === size ? 'selected' : ''}`}
                                                onClick={() => handleImageSizeChange(size)}
                                            >
                                                <span style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{size}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="form-actions">
                                <button className="generate-button" onClick={handleGenerate} disabled={loading}>
                                    {loading && <div className="spinner button-spinner"></div>}
                                    {loading ? 'Generating...' : 'Generate Logo'}
                                </button>
                                <button className="reset-button" onClick={handleReset} disabled={loading}>Reset Form</button>
                            </div>

                            {error && <p className="error-message">{error}</p>}
                        </section>

                        <section className="results-section">
                            <h2>Generated Logos</h2>
                            {generatedPrompt && (
                                <div className="form-group">
                                    <label>Final Prompt Sent to AI</label>
                                    <div className="prompt-preview">{generatedPrompt}</div>
                                </div>
                            )}
                            <div className="image-grid">
                                {loading && Array.from({ length: 2 }).map((_, i) => (
                                    <div key={i} className="placeholder">
                                        <div className="spinner"></div>
                                        <p>Creating high-quality logo...</p>
                                    </div>
                                ))}
                                {!loading && images.length > 0 && images.map((imgSrc, index) => (
                                    <div className="image-container" key={index}>
                                        <img src={`data:image/jpeg;base64,${imgSrc}`} alt={`Generated Logo ${index + 1}`} />
                                        <div className="image-actions">
                                            <button className="edit-button" onClick={() => openEditor(imgSrc, index)}>Edit</button>
                                            <a
                                                href={`data:image/jpeg;base64,${imgSrc}`}
                                                download={`${appState.formData.brandName.replace(/\s+/g, '_') || 'logo'}-${index + 1}.jpeg`}
                                                className="download-button"
                                                aria-label={`Download logo ${index + 1}`}
                                            >
                                                Download
                                            </a>
                                        </div>
                                    </div>
                                ))}
                                {!loading && images.length === 0 && (
                                    <div className="placeholder" style={{ gridColumn: '1 / -1' }}>
                                        <p>Your logos will appear here</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </>
                ) : (
                    <section className="form-section" style={{ gridColumn: '1 / -1' }}>
                        <h2>Analyze Existing Logo</h2>
                        <p>Upload an image of a logo to get a breakdown of its style, potential prompts, and design elements.</p>
                        
                        <div className="file-upload-area">
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleAnalyzeUpload} 
                                className="file-upload-input"
                            />
                            {analyzing ? (
                                <div className="spinner"></div>
                            ) : (
                                <>
                                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: '1rem' }}>📂</span>
                                    <p>Click or Drag to Upload Image</p>
                                </>
                            )}
                        </div>

                        {analyzedImage && (
                            <div className="form-group">
                                <label>Uploaded Image</label>
                                <img src={`data:image/jpeg;base64,${analyzedImage}`} alt="Uploaded for analysis" className="analyzed-image-preview" />
                            </div>
                        )}

                        {analysisResult && (
                            <div className="form-group">
                                <label>Analysis Result</label>
                                <div className="analysis-result">
                                    {analysisResult}
                                </div>
                            </div>
                        )}
                        {error && <p className="error-message">{error}</p>}
                    </section>
                )}
            </main>
            
            {editingImage && (
                <div className="modal-overlay" onClick={() => setEditingImage(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit Logo</h2>
                            <button className="close-button" onClick={() => setEditingImage(null)} aria-label="Close editor">&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="canvas-container">
                                <canvas ref={canvasRef}></canvas>
                            </div>
                            <div className="edit-controls">
                                <div className="control-section">
                                    <h3>Manual Adjustments</h3>
                                    {renderRangeInput('brightness', 'Brightness', 0, 200, '%')}
                                    {renderRangeInput('contrast', 'Contrast', 0, 200, '%')}
                                    {renderRangeInput('saturation', 'Saturation', 0, 200, '%')}
                                    {renderRangeInput('hue', 'Hue', 0, 360, 'deg')}
                                    {renderRangeInput('grayscale', 'Grayscale', 0, 100, '%')}
                                </div>
                                <div className="ai-edit-section">
                                    <h3>AI Edit (Nano Banana)</h3>
                                    <p style={{fontSize: '0.875rem', color: '#a0a0a0', marginBottom: '0.5rem'}}>
                                        Describe what you want to change (e.g., "Add a retro filter", "Remove text").
                                    </p>
                                    <div className="ai-edit-controls">
                                        <input 
                                            type="text" 
                                            value={aiEditPrompt} 
                                            onChange={(e) => setAiEditPrompt(e.target.value)} 
                                            placeholder="Enter edit instruction..."
                                            disabled={aiEditing}
                                        />
                                        <button className="primary-button" onClick={handleAiEdit} disabled={aiEditing || !aiEditPrompt}>
                                            {aiEditing ? 'Editing...' : 'Generate'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <div className="history-actions">
                                <button className="secondary-button" onClick={handleUndo} disabled={currentHistoryIndex <= 0}>Undo</button>
                                <button className="secondary-button" onClick={handleRedo} disabled={currentHistoryIndex >= editHistory.length - 1}>Redo</button>
                            </div>
                            <div className="main-actions">
                                <button className="secondary-button" onClick={() => setEditingImage(null)}>Cancel</button>
                                <button className="primary-button" onClick={handleDownloadEdited}>Save & Download</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);