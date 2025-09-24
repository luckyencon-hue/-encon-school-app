// src/app/dashboard/finance/settings/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@/context/user-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { SchoolCategory, FeeItem, BankAccount } from '@/lib/data';
import { Trash2, PlusCircle, Save, Settings, Landmark, ShieldAlert, ArrowLeft } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function FinanceSettingsPage() {
    const { user, feeStructure, setFeeStructure, bankAccounts, setBankAccounts, setStudents } = useUser();
    const router = useRouter();
    const { toast } = useToast();

    const [editableFeeStructure, setEditableFeeStructure] = useState(JSON.parse(JSON.stringify(feeStructure)));
    const [editableBankAccounts, setEditableBankAccounts] = useState(JSON.parse(JSON.stringify(bankAccounts)));
    const [isDirty, setIsDirty] = useState(false);
    
    useEffect(() => {
        if (!user || !user.isChiefAdmin) {
            router.push('/dashboard/finance');
        }
    }, [user, router]);
    
    if (!user || !user.isChiefAdmin) {
        return null;
    }

    const handleFeeItemChange = (category: SchoolCategory, index: number, field: 'name' | 'amount', value: string) => {
        const newStructure = { ...editableFeeStructure };
        if (field === 'amount') {
            newStructure[category][index][field] = Number(value) || 0;
        } else {
            newStructure[category][index][field] = value;
        }
        setEditableFeeStructure(newStructure);
        setIsDirty(true);
    };

    const handleAddFeeItem = (category: SchoolCategory) => {
        const newStructure = { ...editableFeeStructure };
        newStructure[category].push({ name: '', amount: 0 });
        setEditableFeeStructure(newStructure);
        setIsDirty(true);
    };

    const handleRemoveFeeItem = (category: SchoolCategory, index: number) => {
        const newStructure = { ...editableFeeStructure };
        newStructure[category].splice(index, 1);
        setEditableFeeStructure(newStructure);
        setIsDirty(true);
    };

    const handleBankAccountChange = (index: number, field: keyof BankAccount, value: string) => {
        const newAccounts = [...editableBankAccounts];
        newAccounts[index] = { ...newAccounts[index], [field]: value };
        setEditableBankAccounts(newAccounts);
        setIsDirty(true);
    };

     const handleAddBankAccount = () => {
        setEditableBankAccounts([...editableBankAccounts, { type: 'General', bankName: '', accountName: '', accountNumber: '' }]);
        setIsDirty(true);
    };

    const handleRemoveBankAccount = (index: number) => {
        const newAccounts = [...editableBankAccounts];
        newAccounts.splice(index, 1);
        setEditableBankAccounts(newAccounts);
        setIsDirty(true);
    };

    const handleSaveChanges = () => {
        setFeeStructure(editableFeeStructure);
        setBankAccounts(editableBankAccounts);
        
        // This is a complex operation. In a real app, this would be a backend job.
        // Here, we simulate updating all students' fee details based on their class category.
        setStudents(prevStudents => {
            return prevStudents.map(student => {
                const classCategory = student.classId?.replace(/\d+/g, '').replace(/[^a-zA-Z]/g, '');
                let structureKey: SchoolCategory | undefined;

                if (classCategory) {
                    if (['ss'].includes(classCategory)) structureKey = 'highSchool';
                    else if (['basic'].includes(classCategory)) structureKey = 'upperBasic';
                    else if (['nur'].includes(classCategory)) structureKey = 'nursery';
                }

                if (structureKey) {
                    const structure = editableFeeStructure[structureKey];
                    const totalFees = structure.reduce((acc, item) => acc + item.amount, 0);
                    const amountPaid = student.fees?.amountPaid || 0;
                    const balance = totalFees - amountPaid;
                    const status = balance <= 0 ? 'Paid' : (amountPaid > 0 ? 'Part-payment' : 'Owing');
                    
                    return {
                        ...student,
                        fees: {
                            ...(student.fees || { paymentId: `PAY-${student.regNo}`, paidItems: [] }),
                            totalFees,
                            amountPaid,
                            balance,
                            status,
                        }
                    };
                }
                return student;
            });
        });

        toast({ title: 'Settings Saved', description: 'Finance settings have been updated successfully.' });
        setIsDirty(false);
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft /></Button>
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2"><Settings /> Finance Settings</h1>
                    <p className="text-muted-foreground">Manage school-wide fee structures and designated bank accounts.</p>
                </div>
            </div>
            
            <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Chief Admin Area</AlertTitle>
                <AlertDescription>
                   Changes made on this page affect all students' fee calculations. Please be careful.
                </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Fee Structures by Category</CardTitle>
                        <CardDescription>Define the required fees for each school section.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {(Object.keys(editableFeeStructure) as SchoolCategory[]).map(category => (
                            <div key={category} className="p-4 border rounded-lg">
                                <h3 className="font-semibold capitalize font-headline">{category.replace('highSchool', 'High School').replace('upperBasic', 'Upper Basic')}</h3>
                                <div className="space-y-2 mt-2">
                                    {editableFeeStructure[category].map((item: FeeItem, index: number) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <Input 
                                                placeholder="Item Name (e.g., Tuition)" 
                                                value={item.name}
                                                onChange={(e) => handleFeeItemChange(category, index, 'name', e.target.value)}
                                            />
                                            <Input 
                                                type="number" 
                                                placeholder="Amount" 
                                                value={item.amount}
                                                onChange={(e) => handleFeeItemChange(category, index, 'amount', e.target.value)}
                                                className="w-32"
                                            />
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveFeeItem(category, index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                        </div>
                                    ))}
                                </div>
                                <Button size="sm" variant="outline" className="mt-4" onClick={() => handleAddFeeItem(category)}><PlusCircle className="mr-2"/>Add Item</Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Landmark/> Designated Bank Accounts</CardTitle>
                        <CardDescription>Manage the bank accounts for receiving payments.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            {editableBankAccounts.map((account: BankAccount, index: number) => (
                                <div key={index} className="p-3 border rounded-lg space-y-2 relative">
                                     <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => handleRemoveBankAccount(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                     <div className="grid grid-cols-2 gap-2">
                                        <Input placeholder="Bank Name" value={account.bankName} onChange={(e) => handleBankAccountChange(index, 'bankName', e.target.value)} />
                                        <Select value={account.type} onValueChange={(value) => handleBankAccountChange(index, 'type', value)}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Tuition">Tuition Account</SelectItem>
                                                <SelectItem value="Materials">Materials Account</SelectItem>
                                                <SelectItem value="General">General Account</SelectItem>
                                            </SelectContent>
                                        </Select>
                                     </div>
                                     <Input placeholder="Account Name" value={account.accountName} onChange={(e) => handleBankAccountChange(index, 'accountName', e.target.value)} />
                                     <Input placeholder="Account Number" value={account.accountNumber} onChange={(e) => handleBankAccountChange(index, 'accountNumber', e.target.value)} />
                                </div>
                            ))}
                        </div>
                        <Button size="sm" variant="outline" className="w-full" onClick={handleAddBankAccount}><PlusCircle className="mr-2"/>Add Bank Account</Button>
                    </CardContent>
                </Card>
            </div>

            {isDirty && (
                <div className="sticky bottom-4 z-50 flex justify-end">
                    <Card className="p-2 border-primary/50 bg-background shadow-lg">
                        <div className="flex items-center gap-4">
                            <p className="text-sm font-semibold text-primary">You have unsaved changes.</p>
                            <Button onClick={handleSaveChanges}><Save className="mr-2"/>Save All Changes</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
