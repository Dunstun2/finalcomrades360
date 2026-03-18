import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from './dialog';
import { Button } from './button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
import { ScrollArea } from './scroll-area';

const ChangesDialog = ({
  open,
  onOpenChange,
  changes,
  onConfirm,
  title = "Summary of Changes",
  description = "The following changes have been saved successfully.",
  actionLabel = "Acknowledge & Close"
}) => {
  if (!changes || changes.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 mt-4 border rounded-md p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Field</TableHead>
                <TableHead className="w-[30%] bg-red-50 text-red-900">Before</TableHead>
                <TableHead className="w-[30%] bg-green-50 text-green-900">After</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changes.map((change, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium capitalize">
                    {change.field.replace(/([A-Z])/g, ' $1').trim()}
                  </TableCell>
                  <TableCell className="bg-red-50/50 text-red-700 font-mono text-sm">
                    {typeof change.before === 'object'
                      ? JSON.stringify(change.before, null, 2)
                      : String((change.before !== null && change.before !== undefined && change.before !== '') ? change.before : '(empty)')}
                  </TableCell>
                  <TableCell className="bg-green-50/50 text-green-700 font-mono text-sm">
                    {typeof change.after === 'object'
                      ? JSON.stringify(change.after, null, 2)
                      : String((change.after !== null && change.after !== undefined && change.after !== '') ? change.after : '(empty)')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        <DialogFooter className="mt-6">
          <Button onClick={onConfirm} className="w-full sm:w-auto">
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChangesDialog;