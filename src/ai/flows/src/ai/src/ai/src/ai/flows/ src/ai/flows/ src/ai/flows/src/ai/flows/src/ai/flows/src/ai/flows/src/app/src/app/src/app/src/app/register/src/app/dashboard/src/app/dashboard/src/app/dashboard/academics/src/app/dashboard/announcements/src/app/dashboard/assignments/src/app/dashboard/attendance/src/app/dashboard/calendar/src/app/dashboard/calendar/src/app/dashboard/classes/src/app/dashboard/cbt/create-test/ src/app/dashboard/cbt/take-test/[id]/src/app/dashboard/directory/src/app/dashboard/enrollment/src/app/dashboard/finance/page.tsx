// src/app/dashboard/finance/page.tsx
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useUser } from "@/context/user-context";
import { Student, FeeItem, PaymentConfirmation } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { DollarSign, PlusCircle, Landmark, Upload, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import Image from "next/image";


const PaymentForm = ({ student, onPaymentSuccess, onReceiptSubmit }: { student: Student, onPaymentSuccess: (regNo: string, amount: number, method: string, paidItems: FeeItem[]) => void, onReceiptSubmit: (confirmation: PaymentConfirmation) => void }) => {
    const { user, feeStructure, bankAccounts, schoolClasses } = useUser();
    const { toast } = useToast();
    
    const [selectedItems, setSelectedItems] = useState<FeeItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [uploadedReceipt, setUploadedReceipt] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const studentClassCategory = useMemo(() => {
        const studentClass = schoolClasses.find(c => c.id === student.classId);
        return studentClass?.category;
    }, [student.classId, schoolClasses]);

    const relevantFeeStructure = useMemo(() => {
        if (!studentClassCategory || !feeStructure) return [];
        return feeStructure[studentClassCategory] || [];
    }, [studentClassCategory, feeStructure]);


    const getBalanceForItem = (item: FeeItem) => {
        const paidAmount = student.fees?.paidItems?.find(p => p.name === item.name)?.amount || 0;
        return item.amount - paidAmount;
    }

    const paymentAmount = useMemo(() => {
        return selectedItems.reduce((total, item) => total + getBalanceForItem(item), 0);
    }, [selectedItems, student.fees]);

     useEffect(() => {
        // Pre-select items that have outstanding balances
        const itemsToSelect = relevantFeeStructure.filter(item => getBalanceForItem(item) > 0);
        setSelectedItems(itemsToSelect);
    }, [student.fees, relevantFeeStructure]);

    const handleItemToggle = (item: FeeItem) => {
        setSelectedItems(prev => {
            const isSelected = prev.some(i => i.name === item.name);
            if (isSelected) {
                return prev.filter(i => i.name !== item.name);
            } else {
                return [...prev, item];
            }
        });
    }

    const handleAdminPayment = () => {
        if (paymentAmount <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please select items to pay for.' });
            return;
        }
        if (!paymentMethod) {
            toast({ variant: 'destructive', title: 'Payment Method Required', description: 'Please select a payment method.' });
            return;
        }
        
        onPaymentSuccess(student.regNo, paymentAmount, paymentMethod, selectedItems);
        setSelectedItems([]);
        setPaymentMethod('');
    }
    
    const handleReceiptSubmit = () => {
        if (!uploadedReceipt) {
            toast({ variant: 'destructive', title: 'Receipt Required', description: 'Please upload a payment receipt.' });
            return;
        }
        if (paymentAmount <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please select items to submit a receipt for.' });
            return;
        }
        
        const confirmation: PaymentConfirmation = {
            id: `confirm-${Date.now()}`,
            studentRegNo: student.regNo,
            studentName: student.name,
            amount: paymentAmount,
            paidItems: selectedItems,
            paymentMethod,
            receiptUrl: URL.createObjectURL(uploadedReceipt), // In a real app, upload this to storage
            date: new Date().toISOString()
        }
        onReceiptSubmit(confirmation);
        toast({ title: 'Receipt Submitted', description: 'Your payment is pending confirmation from the admin.' });
    };

    const tuitionAccount = bankAccounts.find(acc => acc.type === 'Tuition');
    const materialsAccount = bankAccounts.find(acc => acc.type === 'Materials');

    return (
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Record Payment for {student.name}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
            <div className="space-y-4 py-4 px-1 pr-4">
                 <div className="text-sm space-y-2 rounded-lg border p-4">
                    <p className="flex justify-between font-semibold text-lg"><span>Outstanding Balance:</span> <span className="font-mono">{student.fees?.balance.toLocaleString()}</span></p>
                    <hr/>
                    <p className="flex justify-between"><span>Payment ID:</span> <span className="font-mono">{student.fees?.paymentId}</span></p>
                    <hr />
                    <p className="flex justify-between font-semibold"><span>Total Fees:</span> <span className="font-mono">{student.fees?.totalFees.toLocaleString()}</span></p>
                    <p className="flex justify-between"><span>Amount Paid:</span> <span className="font-mono">{student.fees?.amountPaid.toLocaleString()}</span></p>
                </div>
                
                <div className="space-y-2">
                    <Label>Select Items to Pay For</Label>
                    <div className="space-y-2 rounded-md border p-4">
                        {relevantFeeStructure.map(item => {
                            const balance = getBalanceForItem(item);
                            return (
                                <div className="flex items-center justify-between" key={item.name}>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={item.name}
                                            onCheckedChange={() => handleItemToggle(item)} 
                                            checked={selectedItems.some(i => i.name === item.name)}
                                            disabled={balance <= 0}
                                        />
                                        <Label htmlFor={item.name} className="font-medium">{item.name}</Label>
                                    </div>
                                    <span className="font-mono">{balance.toLocaleString()}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">Payment Amount</Label>
                        <Input id="amount" type="text" value={paymentAmount.toLocaleString()} readOnly className="font-bold font-mono" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="paymentMethod">Payment Method</Label>
                         <Select onValueChange={setPaymentMethod} value={paymentMethod}>
                            <SelectTrigger id="paymentMethod">
                                <SelectValue placeholder="Select Method" />
                            </SelectTrigger>
                            <SelectContent>
                                 <SelectItem value="Cash">Cash</SelectItem>
                                 <SelectItem value="POS">POS</SelectItem>
                                 <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                
                 {paymentMethod === 'Bank Transfer' && (
                    <Card className="mt-4 bg-blue-500/10 border-blue-500/20">
                        <CardHeader className="p-4">
                            <CardTitle className="text-base font-headline flex items-center gap-2 text-blue-800 dark:text-blue-300">
                                <Landmark className="h-5 w-5" /> Bank Account Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 text-sm text-blue-700 dark:text-blue-300 space-y-3">
                           {tuitionAccount && (
                             <div>
                                <p className="font-semibold">{tuitionAccount.accountName} (For Tuition)</p>
                                <p><strong>Bank:</strong> {tuitionAccount.bankName}</p>
                                <p><strong>Account Number:</strong> {tuitionAccount.accountNumber}</p>
                            </div>
                           )}
                           {materialsAccount && (
                             <div>
                                <p className="font-semibold">{materialsAccount.accountName} (For Materials)</p>
                                <p><strong>Bank:</strong> {materialsAccount.bankName}</p>
                                <p><strong>Account Number:</strong> {materialsAccount.accountNumber}</p>
                            </div>
                           )}
                        </CardContent>
                    </Card>
                 )}
                 
                 {user?.role !== 'Admin' && paymentMethod === 'Bank Transfer' && (
                    <div className="space-y-2 mt-4">
                        <Label>Upload Receipt</Label>
                        <Input
                            type="file"
                            ref={fileInputRef}
                            onChange={(e) => setUploadedReceipt(e.target.files?.[0] || null)}
                            accept="image/png, image/jpeg, application/pdf"
                            className="hidden"
                        />
                         <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
                            <Upload className="mr-2"/>
                            {uploadedReceipt ? uploadedReceipt.name : "Choose File"}
                         </Button>
                    </div>
                 )}
            </div>
            </ScrollArea>
            <DialogFooter className="pt-4 border-t">
                 <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                 {user?.role === 'Admin' ? (
                     <DialogClose asChild>
                        <Button onClick={handleAdminPayment}><PlusCircle className="mr-2" /> Record Payment</Button>
                    </DialogClose>
                 ) : (
                    <DialogClose asChild>
                        <Button onClick={handleReceiptSubmit} disabled={paymentAmount <= 0 || !uploadedReceipt}>
                           <Upload className="mr-2" /> Submit for Confirmation
                        </Button>
                    </DialogClose>
                 )}
            </DialogFooter>
        </DialogContent>
    )
}

export default function FinancePage() {
    const { user, students, setStudents, paymentConfirmations, setPaymentConfirmations } = useUser();
    const { toast } = useToast();

    const handlePaymentSuccess = (regNo: string, amount: number, method: string, paidItems: FeeItem[]) => {
        setStudents(prevStudents => prevStudents.map(s => {
            if (s.regNo === regNo && s.fees) {
                const newAmountPaid = s.fees.amountPaid + amount;
                const newBalance = s.fees.totalFees - newAmountPaid;
                const newStatus: "Paid" | "Owing" | "Part-payment" = newBalance <= 0 ? "Paid" : "Part-payment";
                
                const updatedPaidItems = [...(s.fees.paidItems || [])];
                paidItems.forEach(paidItem => {
                    const existingPaid = updatedPaidItems.find(p => p.name === paidItem.name);
                    const balanceForItem = getBalanceForItem(paidItem, s.fees?.paidItems || []);
                    
                    if (existingPaid) {
                        existingPaid.amount += balanceForItem;
                    } else {
                        updatedPaidItems.push({ name: paidItem.name, amount: balanceForItem });
                    }
                });

                return {
                    ...s,
                    fees: {
                        ...s.fees,
                        amountPaid: newAmountPaid,
                        balance: newBalance,
                        status: newStatus,
                        paidItems: updatedPaidItems,
                    }
                }
            }
            return s;
        }));
        toast({
            title: "Payment Recorded",
            description: `Successfully recorded a payment of ${amount.toLocaleString()} for student ${regNo} via ${method}.`
        })
    };
    
    const handleReceiptSubmit = (confirmation: PaymentConfirmation) => {
        setPaymentConfirmations(prev => [confirmation, ...prev]);
    };
    
    const handleApproveConfirmation = (confirmationId: string) => {
        const confirmation = paymentConfirmations.find(c => c.id === confirmationId);
        if (!confirmation) return;
        
        handlePaymentSuccess(confirmation.studentRegNo, confirmation.amount, confirmation.paymentMethod, confirmation.paidItems);
        setPaymentConfirmations(prev => prev.filter(c => c.id !== confirmationId));
        toast({ title: 'Payment Approved', description: `Payment for ${confirmation.studentName} has been confirmed.` });
    };

    const handleRejectConfirmation = (confirmationId: string) => {
        setPaymentConfirmations(prev => prev.filter(c => c.id !== confirmationId));
        toast({ variant: 'destructive', title: 'Payment Rejected', description: 'The payment confirmation has been rejected and removed.' });
    };

    const getBalanceForItem = (item: FeeItem, paidItems: FeeItem[]) => {
        const paidAmount = paidItems.find(p => p.name === item.name)?.amount || 0;
        return item.amount - paidAmount;
    };

    if (!user) return null;
    const isUserAllowed = user.role === 'Admin' || user.role === 'Student' || user.role === 'Parent';
    const isChiefAdmin = user.isChiefAdmin;
    
    const displayedStudents = isUserAllowed ? (user.role === 'Admin' ? students : students.filter(s => s.regNo === user.regNo)) : [];

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Finance</h1>
                    <p className="text-muted-foreground">
                        Manage student fee payments and financial records.
                    </p>
                </div>
                {isChiefAdmin && (
                    <Button asChild>
                        <Link href="/dashboard/finance/settings">Finance Settings</Link>
                    </Button>
                )}
            </div>

            {user.role === 'Admin' && paymentConfirmations.length > 0 && (
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><AlertCircle className="text-yellow-500" /> Pending Payment Confirmations</CardTitle>
                        <CardDescription>Review and approve payments submitted by parents/students.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Receipt</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paymentConfirmations.map(conf => (
                                    <TableRow key={conf.id}>
                                        <TableCell>{conf.studentName} ({conf.studentRegNo})</TableCell>
                                        <TableCell className="font-mono">{conf.amount.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <a href={conf.receiptUrl} target="_blank" rel="noopener noreferrer">
                                                <Image src={conf.receiptUrl} alt="Receipt" width={40} height={40} className="rounded-md object-cover" />
                                            </a>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => handleApproveConfirmation(conf.id)}><CheckCircle className="mr-2 h-4 w-4" />Approve</Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleRejectConfirmation(conf.id)}><XCircle className="mr-2 h-4 w-4"/>Reject</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Student Fee Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Payment ID</TableHead>
                                <TableHead>Total Fees</TableHead>
                                <TableHead>Balance</TableHead>
                                <TableHead>Status</TableHead>
                                {isUserAllowed && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayedStudents.map(student => (
                                <TableRow key={student.regNo}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={student.avatar} alt={student.name} data-ai-hint="person" />
                                                <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{student.name}</p>
                                                <p className="text-xs text-muted-foreground">{student.regNo}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{student.fees?.paymentId}</TableCell>
                                    <TableCell className="font-mono">{student.fees?.totalFees.toLocaleString() || 'N/A'}</TableCell>
                                    <TableCell className="font-mono font-semibold">{student.fees?.balance.toLocaleString() || 'N/A'}</TableCell>
                                    <TableCell>
                                        {student.fees?.status && (
                                            <Badge variant={
                                                student.fees.status === 'Paid' ? 'default' :
                                                student.fees.status === 'Owing' ? 'destructive' :
                                                'secondary'
                                            } className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 data-[variant=destructive]:bg-red-100 data-[variant=destructive]:text-red-800 dark:data-[variant=destructive]:bg-red-900/20 dark:data-[variant=destructive]:text-red-300 data-[variant=secondary]:bg-yellow-100 data-[variant=secondary]:text-yellow-800 dark:data-[variant=secondary]:bg-yellow-900/20 dark:data-[variant=secondary]:text-yellow-300">
                                                {student.fees.status}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    {isUserAllowed && (
                                        <TableCell className="text-right">
                                            {student.fees?.status !== 'Paid' && (
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" size="sm">
                                                            <DollarSign className="mr-2 h-4 w-4" />
                                                            {user.role === 'Admin' ? 'Record Payment' : 'Make Payment'}
                                                        </Button>
                                                    </DialogTrigger>
                                                    <PaymentForm 
                                                        student={student} 
                                                        onPaymentSuccess={handlePaymentSuccess} 
                                                        onReceiptSubmit={handleReceiptSubmit}
                                                    />
                                                </Dialog>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
