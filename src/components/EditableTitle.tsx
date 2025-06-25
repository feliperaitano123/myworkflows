import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditableTitleProps {
  title: string;
  onSave: (newTitle: string) => void;
  isLoading?: boolean;
  className?: string;
}

export const EditableTitle: React.FC<EditableTitleProps> = ({
  title,
  onSave,
  isLoading = false,
  className
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(title);
  }, [title]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditValue(title);
  };

  const handleSave = () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue && trimmedValue !== title) {
      onSave(trimmedValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(title);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="text-2xl font-semibold h-auto py-1 px-2 border-dashed"
          disabled={isLoading}
        />
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            disabled={isLoading || !editValue.trim()}
            className="h-8 w-8 p-0"
          >
            <Check className="h-4 w-4 text-green-600" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 group", className)}>
      <h1 className="text-2xl font-semibold text-foreground">
        {title}
      </h1>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleStartEdit}
        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        disabled={isLoading}
      >
        <Edit2 className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  );
};