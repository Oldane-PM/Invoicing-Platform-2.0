import * as React from "react";
import { Dialog, DialogContent } from "../ui/dialog";
import { CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

interface SuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message?: string;
  autoCloseDuration?: number; // in milliseconds, 0 to disable
}

export function SuccessModal({
  open,
  onOpenChange,
  title = "Success!",
  message = "Operation completed successfully",
  autoCloseDuration = 3000,
}: SuccessModalProps) {
  React.useEffect(() => {
    if (open && autoCloseDuration > 0) {
      const timer = setTimeout(() => {
        onOpenChange(false);
      }, autoCloseDuration);

      return () => clearTimeout(timer);
    }
  }, [open, autoCloseDuration, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-white p-0 border-0">
        <div className="p-8 flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
            }}
          >
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {title}
            </h3>
            <p className="text-sm text-gray-600">{message}</p>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
