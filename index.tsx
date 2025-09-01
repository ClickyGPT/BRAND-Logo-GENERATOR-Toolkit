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
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: {
                    numberOfImages: 4,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: appState.aspectRatio,
                },
            });

            if (response.generatedImages && response.generatedImages.length > 0) {
                const imageBytesArray = response.generatedImages.map(img => img.image.imageBytes);
                setImages(imageBytesArray);
            } else {
                setError('The API did not return any images. Please try refining your prompt.');
            }
        } catch (e) {
            console.error(e);
            let friendlyErrorMessage = 'An unexpected error occurred while generating the logo. Please try again later.';
            if (e instanceof Error) {
                const errorMessage = e.message.toLowerCase();
                if (errorMessage.includes('api key not valid')) {
                    friendlyErrorMessage = 'Invalid API Key. Please ensure your API key is correctly configured.';
                } else if (errorMessage.includes('rate limit')) {
                    friendlyErrorMessage = 'You have exceeded the request limit. Please wait a while before trying again.';
                } else if (errorMessage.includes('prompt was blocked')) {
                    friendlyErrorMessage = 'Your prompt was blocked due to safety concerns. Please modify your prompt and try again.';
                } else {
                    friendlyErrorMessage = 'An error occurred while generating the logo. Please check your input and try again.';
                }
            }
            setError(friendlyErrorMessage);
        } finally {
            setLoading(false);
        }
    };
    
    const handleReset = () => {
        if (window.confirm("Are you sure you want to reset the form? All your inputs and generated images will be lost.")) {
            localStorage.removeItem(STORAGE_KEY);
            setAppState(defaultState);
            setImages([]);
            setError(null);
            setGeneratedPrompt('');
        }
    };

    // Image Editor Functions
    const openEditor = (src: string, index: number) => {
        setEditingImage({ src, index });
        setEdits(initialEdits);
        setEditHistory([initialEdits]);
        setCurrentHistoryIndex(0);
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
                <p>Craft the perfect prompt and generate your brand's logo with AI.</p>
            </header>
            <main>
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
                    
                    <div className="form-group">
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
                        {loading && Array.from({ length: 4 }).map((_, i) => (
                             <div key={i} className="placeholder">
                                <div className="spinner"></div>
                                <p>The AI is working...</p>
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
                         {!loading && images.length === 0 && Array.from({ length: 4 }).map((_, i) => (
                             <div key={i} className="placeholder">{ i === 0 && <p>Your logos will appear here</p>}</div>
                        ))}
                    </div>
                </section>
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
                                {renderRangeInput('brightness', 'Brightness', 0, 200, '%')}
                                {renderRangeInput('contrast', 'Contrast', 0, 200, '%')}
                                {renderRangeInput('saturation', 'Saturation', 0, 200, '%')}
                                {renderRangeInput('hue', 'Hue', 0, 360, 'deg')}
                                {renderRangeInput('grayscale', 'Grayscale', 0, 100, '%')}
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