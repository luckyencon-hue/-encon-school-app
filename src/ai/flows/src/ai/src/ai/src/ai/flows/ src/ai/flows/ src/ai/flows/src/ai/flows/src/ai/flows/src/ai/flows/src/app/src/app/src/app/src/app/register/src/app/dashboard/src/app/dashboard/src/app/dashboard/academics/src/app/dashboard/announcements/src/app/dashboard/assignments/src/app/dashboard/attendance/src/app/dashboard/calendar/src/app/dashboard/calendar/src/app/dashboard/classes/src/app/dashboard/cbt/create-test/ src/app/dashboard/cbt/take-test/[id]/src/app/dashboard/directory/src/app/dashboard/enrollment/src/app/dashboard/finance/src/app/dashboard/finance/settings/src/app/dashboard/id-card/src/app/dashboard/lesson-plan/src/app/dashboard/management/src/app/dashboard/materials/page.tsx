// src/app/dashboard/materials/page.tsx
"use client";

import { useState, useMemo, useRef } from "react";
import { useUser } from "@/context/user-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Film, FileText, Image as ImageIcon, PlusCircle, Trash2, BookOpen, Loader2, Download } from "lucide-react";
import Image from 'next/image';
import type { LearningMaterial } from "@/lib/data";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import MarkdownRenderer from "@/components/markdown-renderer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, deleteDoc, doc } from "firebase/firestore";

const MaterialIcon = ({ type }: { type: LearningMaterial['type'] }) => {
  switch (type) {
    case 'video': return <Film className="h-5 w-5 text-red-500" />;
    case 'slide': return <FileText className="h-5 w-5 text-yellow-500" />;
    case 'document': return <FileText className="h-5 w-5 text-blue-500" />;
    case 'image': return <ImageIcon className="h-5 w-5 text-green-500" />;
    default: return <FileText className="h-5 w-5" />;
  }
}

export default function MaterialsPage() {
  const { user, learningMaterials, setLearningMaterials, subjects: allSubjects, schoolClasses } = useUser();
  const [newMaterial, setNewMaterial] = useState({ title: '', subject: '', classId: '', type: 'document' as LearningMaterial['type'], url: '', file: null as File | null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const canUpload = user.role === 'Admin' || user.role === 'Staff';

  const myMaterials = useMemo(() => {
    if (!user || !user.schoolId) return [];
    const schoolMaterials = learningMaterials.filter(m => m.schoolId === user.schoolId);

    if (canUpload) return schoolMaterials;
    
    if (user.role === 'Student') {
        const studentClassId = user.classId;
        return schoolMaterials.filter(m => m.classId === 'all' || m.classId === studentClassId);
    }

    if (user.role === 'Parent') {
        return schoolMaterials.filter(m => m.classId === 'all_parents' || m.classId === 'all');
    }

    return [];
  }, [user, learningMaterials, canUpload]);

  const handleAddMaterial = async () => {
    if (!newMaterial.title || !newMaterial.subject || !newMaterial.classId) {
        toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill out title, subject, and target audience.' });
        return;
    }
     if (['document', 'image'].includes(newMaterial.type) && !newMaterial.file) {
      toast({ variant: 'destructive', title: 'File Required', description: 'Please choose a file to upload for this material type.' });
      return;
    }
    if (['video', 'slide'].includes(newMaterial.type) && !newMaterial.url) {
      toast({ variant: 'destructive', title: 'URL Required', description: 'Please provide a URL for this material type.' });
      return;
    }
    if (!user || !user.schoolId) return;

    setIsSubmitting(true);
    try {
        let fileDataUrl: string | undefined;
        if (newMaterial.file) {
            fileDataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(newMaterial.file);
            });
        }

        const newEntry: Omit<LearningMaterial, 'id'> = {
          title: newMaterial.title,
          subject: newMaterial.subject,
          classId: newMaterial.classId,
          type: newMaterial.type,
          url: newMaterial.url || undefined,
          fileDataUrl: fileDataUrl,
          uploadedBy: user.name,
          date: new Date().toISOString(),
          schoolId: user.schoolId,
        };
        const docRef = await addDoc(collection(db, "learningMaterials"), newEntry);

        setLearningMaterials(prev => [{...newEntry, id: docRef.id } as LearningMaterial, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setNewMaterial({ title: '', subject: '', classId: '', type: 'document', url: '', file: null });
        if(fileInputRef.current) fileInputRef.current.value = "";
        toast({ title: 'Material Added', description: 'The new resource is now available.' });
    } catch (error) {
        console.error("Error adding material:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not add the material.' });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleRemoveMaterial = async (id: string) => {
    setIsSubmitting(true);
    try {
        await deleteDoc(doc(db, "learningMaterials", id));
        setLearningMaterials(prev => prev.filter(material => material.id !== id));
        toast({ title: 'Material Removed' });
    } catch (error) {
        console.error("Error removing material:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not remove the material.' });
    } finally {
        setIsSubmitting(false);
    }
  }

  const schoolSubjects = allSubjects.filter(s => s.schoolId === user.schoolId);
  const mySchoolClasses = schoolClasses.filter(c => c.schoolId === user.schoolId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Learning Materials</h1>
        <p className="text-muted-foreground">
          Access course materials, lecture notes, and other resources.
        </p>
      </div>

      {canUpload && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
              <Upload className="h-5 w-5" />
              Upload New Material
            </CardTitle>
            <CardDescription>Add a new resource for students, parents, or everyone.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              placeholder="Material Title"
              value={newMaterial.title}
              onChange={(e) => setNewMaterial(prev => ({ ...prev, title: e.target.value }))}
              className="lg:col-span-3"
              disabled={isSubmitting}
            />
            <Select value={newMaterial.subject} onValueChange={(value) => setNewMaterial(prev => ({ ...prev, subject: value }))} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Select Subject" />
              </SelectTrigger>
              <SelectContent>
                {schoolSubjects.map(subject => <SelectItem key={subject.id} value={subject.name}>{subject.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={newMaterial.classId} onValueChange={(value) => setNewMaterial(prev => ({ ...prev, classId: value }))} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Share with..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="all_parents">All Parents</SelectItem>
                {mySchoolClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={newMaterial.type} onValueChange={(value) => setNewMaterial(prev => ({ ...prev, type: value as LearningMaterial['type'] }))} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="document">Document (PDF)</SelectItem>
                <SelectItem value="image">Image (PNG, JPG)</SelectItem>
                <SelectItem value="video">Video (YouTube)</SelectItem>
                <SelectItem value="slide">Slides (Google Slides)</SelectItem>
              </SelectContent>
            </Select>
             {['video', 'slide'].includes(newMaterial.type) && (
                 <Input
                  placeholder="Paste URL (e.g., YouTube, Google Slides)"
                  value={newMaterial.url}
                  onChange={(e) => setNewMaterial(prev => ({ ...prev, url: e.target.value }))}
                  className="lg:col-span-3"
                  disabled={isSubmitting}
                />
            )}
             {['document', 'image'].includes(newMaterial.type) && (
                 <Input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => setNewMaterial(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                  className="lg:col-span-3"
                  accept={newMaterial.type === 'image' ? 'image/png, image/jpeg' : '.pdf'}
                  disabled={isSubmitting}
                />
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleAddMaterial} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <PlusCircle className="mr-2" />}
              Add Material
            </Button>
          </CardFooter>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {myMaterials.map(material => (
          <Card key={material.id} className="flex flex-col">
            <CardHeader className="p-0 relative">
               {material.type === 'image' && material.fileDataUrl ? (
                    <Image 
                        src={material.fileDataUrl} 
                        alt={material.title} 
                        width={300} 
                        height={200}
                        className="rounded-t-lg w-full aspect-video object-cover" 
                    />
               ) : (
                    <div className="rounded-t-lg w-full aspect-video bg-muted flex items-center justify-center">
                        <MaterialIcon type={material.type} />
                    </div>
               )}
            </CardHeader>
            <CardContent className="p-4 flex-grow">
              <p className="text-xs font-semibold text-primary">{material.subject}</p>
              <h3 className="font-semibold font-headline leading-tight mt-1">{material.title}</h3>
            </CardContent>
            <CardFooter className="p-4 pt-0 text-xs text-muted-foreground flex justify-between items-center">
                <p>By: {material.uploadedBy}</p>
                 <div className="flex items-center gap-1">
                  {material.content && (
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm"><BookOpen className="mr-2 h-4 w-4"/>Note</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh]">
                             <DialogHeader>
                                <DialogTitle>{material.title}</DialogTitle>
                                <DialogDescription>Subject: {material.subject} | Posted by: {material.uploadedBy}</DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="h-[60vh] rounded-md border p-4">
                               <MarkdownRenderer content={material.content} />
                            </ScrollArea>
                             <DialogFooter>
                                <DialogClose asChild><Button type="button">Close</Button></DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                  )}
                  {(material.url || material.fileDataUrl) && (
                      <Button asChild variant="secondary" size="sm">
                          <a href={material.url || material.fileDataUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="mr-2 h-4 w-4" />
                              View
                          </a>
                      </Button>
                  )}
                  {canUpload && user?.name === material.uploadedBy && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveMaterial(material.id)} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                      </Button>
                  )}
                </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
