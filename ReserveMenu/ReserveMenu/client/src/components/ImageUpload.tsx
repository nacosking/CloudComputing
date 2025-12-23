import { useState } from "react";
// If these imports fail, standard HTML tags work too!
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export function ImageUpload({ onUpload }: { onUpload: (url: string) => void }) {
    const [uploading, setUploading] = useState(false);
    const { toast } = useToast();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("image", file);

        try {
            // 1. Send file to your backend route
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Upload failed");

            // 2. Get the S3 URL back
            const data = await res.json();

            // 3. Tell the parent component the new URL
            onUpload(data.url);

            toast({
                title: "Success",
                description: "Image uploaded to S3 successfully!",
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to upload image",
                variant: "destructive",
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex items-center gap-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
                <Input
                    id="picture"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={uploading}
                />
            </div>
            {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
        </div>
    );
}