import { useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X,
  BookOpen,
  Search,
  Plus,
  MapPin,
  MessageSquare,
  Users,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  details: string[];
  icon: React.ReactNode;
  tips?: string[];
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Admin Console",
    description: "Manage shipments, customers, and support all in one place",
    details: [
      "This guide will walk you through all key features",
      "You can skip this guide at any time",
      "The guide covers 6 main areas of the admin console",
      "Each step includes practical tips and best practices"
    ],
    icon: <BookOpen className="h-8 w-8" />,
    tips: [
      "Pro tip: Keep this guide open in a new tab for reference",
      "All fields are explained with inline help text"
    ]
  },
  {
    id: "dashboard",
    title: "Dashboard & Metrics",
    description: "Monitor key shipment statistics at a glance",
    details: [
      "Total parcels: All shipments in the system",
      "In transit: Shipments currently moving through the network",
      "Delivered: Completed shipments with confirmed delivery",
      "Customers: Distinct customer identities linked to shipments",
      "Click 'Refresh data' to reload statistics after changes"
    ],
    icon: <CheckCircle2 className="h-8 w-8" />,
    tips: [
      "Refresh data frequently to see latest updates",
      "Use these metrics to understand your shipment volume"
    ]
  },
  {
    id: "inventory",
    title: "Shipment Inventory",
    description: "Search, filter, and find shipments quickly",
    details: [
      "Search by: tracking number, reference number, city, email, or customer name",
      "Filter by status: All, Pending, In Transit, Out for Delivery, Delivered, Exception",
      "Click any shipment to load it into the detail editor",
      "Search updates results in real-time as you type",
      "Combine search + filter for precise results"
    ],
    icon: <Search className="h-8 w-8" />,
    tips: [
      "Always search before creating a new shipment to avoid duplicates",
      "Use location names for quick city-wide searches"
    ]
  },
  {
    id: "create",
    title: "Creating Shipments",
    description: "Generate new shipments using Quick Create or Full Editor",
    details: [
      "Quick Create: Select preset status → Enter customer email → Click 'Generate parcel'",
      "Presets include: Pending, In Transit, Out for Delivery, Delivered, Exception",
      "Customer email is crucial for sending notifications to receivers",
      "Full Editor: Complete control over all shipment fields",
      "Tracking number auto-generates if left blank",
      "Initial event is logged automatically"
    ],
    icon: <Plus className="h-8 w-8" />,
    tips: [
      "Always enter customer email so receivers get notified",
      "Customer name auto-populates from the email address",
      "Test with sample data before going live"
    ]
  },
  {
    id: "updates",
    title: "Updating Shipments",
    description: "Edit shipment details and track status changes",
    details: [
      "Find and select a shipment from inventory",
      "Modify any field in the detail editor",
      "Add events describing what changed (status update, location scan, etc)",
      "Click 'Save shipment' to persist changes",
      "Status changes trigger email notifications if customer email exists",
      "For delivery: fill in Proof of Delivery (date, recipient name)"
    ],
    icon: <MapPin className="h-8 w-8" />,
    tips: [
      "Add descriptive events for every status change",
      "Use 'Live location update' for quick location pushes",
      "Changes appear immediately after save"
    ]
  },
  {
    id: "support",
    title: "Support & Customer Service",
    description: "Handle customer inquiries and provide updates",
    details: [
      "Support Inbox: Lists all customer threads tied to tracking numbers",
      "Click a thread to view the conversation history",
      "Customer messages show in regular boxes, admin replies highlighted",
      "Type your response in the reply box at bottom",
      "Click 'Send admin reply' to respond to customers",
      "Common replies: shipment updates, ETAs, issue explanations"
    ],
    icon: <MessageSquare className="h-8 w-8" />,
    tips: [
      "Respond promptly to customer inquiries",
      "Include tracking number, status, and ETA in replies",
      "Note any issues (delays, weather) transparently"
    ]
  },
  {
    id: "email",
    title: "Email Notifications",
    description: "Configure and monitor customer email notifications",
    details: [
      "Notifications sent automatically when shipments are created or updated",
      "Status messages show in toast popups at top of screen",
      "Success: 'Receiver email notification sent'",
      "Missing email: 'No receiver email found for this shipment'",
      "Not configured: Set RESEND_API_KEY and MAIL_FROM environment variables",
      "Without configuration, notifications will be skipped"
    ],
    icon: <Bell className="h-8 w-8" />,
    tips: [
      "Check environment variables if notifications fail",
      "Test notifications with sample data after config",
      "Customer email is required for notifications"
    ]
  },
  {
    id: "users",
    title: "User Management",
    description: "Manage admin user accounts and access",
    details: [
      "Registered Users panel shows all local auth users",
      "Each user shows name, email, and role",
      "Click 'Remove' to delete a user account",
      "Removed users cannot log back in with that email",
      "Useful for removing inactive or departed admins",
      "New users can register via admin signup page"
    ],
    icon: <Users className="h-8 w-8" />,
    tips: [
      "Confirm before deleting user accounts",
      "Keep user list current by removing inactive admins"
    ]
  },
  {
    id: "complete",
    title: "You're Ready!",
    description: "Start using the admin console with confidence",
    details: [
      "✓ You've learned all major features",
      "✓ You know how to create, edit, and track shipments",
      "✓ You can respond to customer support inquiries",
      "✓ You understand email notification configuration",
      "✓ Reference this guide anytime via browser history"
    ],
    icon: <CheckCircle2 className="h-8 w-8" />,
    tips: [
      "Click 'Mark as done' to dismiss this guide",
      "Force the guide back: Clear browser storage for this site",
      "Best practices: Search before create, add events for changes, email customers promptly"
    ]
  }
];

interface AdminOnboardingTourProps {
  onDismiss: () => void;
}

export function AdminOnboardingTour({ onDismiss }: AdminOnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    window.localStorage.setItem("fdx_admin_onboarded_v1", new Date().toISOString());
    window.sessionStorage.removeItem("fdx_admin_show_onboarding_v1");
    onDismiss();
  };

  const stepPercentage = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-2xl border-[#d7c8ff] bg-gradient-to-br from-[#f8f5ff] to-[#f1edf9] shadow-2xl">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-[#5b2b95] p-3 text-white">
                {step.icon}
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">{step.title}</CardTitle>
                <CardDescription className="text-base mt-1">{step.description}</CardDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={handleComplete}
              className="text-[#5b2b95] hover:bg-[#5b2b95]/10 rounded-full p-2 transition-colors"
              aria-label="Close guide"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/50">
              <div
                className="h-full bg-gradient-to-r from-[#5b2b95] to-[#7d3fa3] transition-all duration-300"
                style={{ width: `${stepPercentage}%` }}
              />
            </div>
            <p className="text-xs text-[#5b2b95] font-semibold">
              Step {currentStep + 1} of {ONBOARDING_STEPS.length}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pb-6">
          {/* Details list */}
          <div className="space-y-3">
            {step.details.map((detail, idx) => (
              <div key={idx} className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[#5b2b95] mt-0.5" />
                <p className="text-[#333] leading-relaxed">{detail}</p>
              </div>
            ))}
          </div>

          {/* Tips section */}
          {step.tips && step.tips.length > 0 && (
            <div className="rounded-lg bg-white/60 border border-[#d7c8ff] p-4">
              <p className="font-semibold text-[#5b2b95] text-sm mb-2">💡 Pro Tips</p>
              <ul className="space-y-2 text-sm text-[#333]">
                {step.tips.map((tip, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-[#5b2b95] font-bold">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={isFirstStep}
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {isLastStep ? (
              <Button
                onClick={handleComplete}
                className="flex-1 bg-gradient-to-r from-[#5b2b95] to-[#7d3fa3] hover:from-[#4a1f7a] hover:to-[#6a2d8f]"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark as done
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="flex-1 bg-gradient-to-r from-[#5b2b95] to-[#7d3fa3] hover:from-[#4a1f7a] hover:to-[#6a2d8f]"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>

          {/* Step indicators */}
          <div className="flex gap-2 justify-center pt-2">
            {ONBOARDING_STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep
                    ? "w-6 bg-[#5b2b95]"
                    : "w-2 bg-[#d7c8ff] hover:bg-[#c9b4e0]"
                }`}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
