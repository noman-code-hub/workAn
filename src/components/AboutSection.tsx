import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import type { User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface AboutSectionProps {
    user: User;
    isOwnProfile?: boolean;
}

export const AboutSection = ({ user, isOwnProfile = true }: AboutSectionProps) => {
    const { updateProfile } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [aboutText, setAboutText] = useState(user.about || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await updateProfile({ about: aboutText });
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update about section:', error);
            alert('Failed to save. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setAboutText(user.about || '');
        setIsEditing(false);
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>About</h2>
                {isOwnProfile && !isEditing && (
                    <button style={styles.editBtn} onClick={() => setIsEditing(true)}>
                        <Pencil size={20} />
                    </button>
                )}
            </div>

            {isEditing ? (
                <div style={styles.editWrapper}>
                    <textarea
                        value={aboutText}
                        onChange={(e) => setAboutText(e.target.value)}
                        style={styles.textarea}
                        rows={6}
                        placeholder="Write a few lines about your professional background, skills, and goals..."
                    />
                    <div style={styles.actions}>
                        <button style={styles.cancelBtn} onClick={handleCancel} disabled={isSaving}>
                            <X size={16} /> Cancel
                        </button>
                        <button style={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
                            {isSaving ? 'Saving...' : <><Check size={16} /> Save</>}
                        </button>
                    </div>
                </div>
            ) : (
                <p style={styles.content}>
                    {user.about || (isOwnProfile ? "Click the pencil icon to add a summary about yourself." : "No information shared yet.")}
                </p>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.08)',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
    },
    title: {
        fontSize: '20px',
        fontWeight: '600',
        color: 'rgba(0,0,0,0.9)',
        margin: 0,
    },
    editBtn: {
        background: 'none',
        border: 'none',
        color: '#666',
        cursor: 'pointer',
        padding: '8px',
        borderRadius: '50%',
        transition: 'background 0.2s',
    },
    content: {
        fontSize: '14px',
        lineHeight: '1.5',
        color: 'rgba(0,0,0,0.9)',
        whiteSpace: 'pre-wrap',
    },
    editWrapper: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    textarea: {
        width: '100%',
        padding: '12px',
        borderRadius: '4px',
        border: '1px solid #0a66c2',
        fontSize: '14px',
        fontFamily: 'inherit',
        outline: 'none',
    },
    actions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
    },
    saveBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: '#0a66c2',
        color: 'white',
        border: 'none',
        borderRadius: '20px',
        padding: '6px 16px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    cancelBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: 'transparent',
        color: '#666',
        border: '1px solid #666',
        borderRadius: '20px',
        padding: '6px 16px',
        fontWeight: '600',
        cursor: 'pointer',
    }
};
