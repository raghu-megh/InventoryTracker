import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/ui/status-badge";
import { formatDistanceToNow } from "date-fns";

interface WebhookEvent {
  id: string;
  eventType: string;
  cloverObjectId: string;
  processed: boolean;
  processingError?: string;
  receivedAt: string;
  payload: any;
}

interface WebhookActivityProps {
  events: WebhookEvent[];
}

export default function WebhookActivity({ events }: WebhookActivityProps) {
  const getEventDisplayName = (eventType: string) => {
    return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getEventDescription = (event: WebhookEvent) => {
    switch (event.eventType) {
      case 'PAYMENT_CREATED':
        return `Order #${event.cloverObjectId.slice(-6)} - Payment processed`;
      case 'ORDER_UPDATED':
      case 'ORDER_CREATED':
        return `Order #${event.cloverObjectId.slice(-6)} - Order modified`;
      case 'INVENTORY_UPDATED':
        return `Item ${event.cloverObjectId.slice(-6)} - Inventory updated`;
      default:
        return `Object ${event.cloverObjectId.slice(-6)}`;
    }
  };

  const getEventStatus = (event: WebhookEvent) => {
    if (event.processingError) {
      return 'error';
    }
    return event.processed ? 'success' : 'pending';
  };

  return (
    <Card className="border border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-800">
            Recent Webhook Activity
          </CardTitle>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500">No webhook events yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.slice(0, 5).map((event) => (
              <div key={event.id} className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  getEventStatus(event) === 'success' 
                    ? 'bg-success-500' 
                    : getEventStatus(event) === 'error'
                    ? 'bg-danger-500'
                    : 'bg-warning-500'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    {getEventDisplayName(event.eventType)}
                  </p>
                  <p className="text-sm text-slate-600">
                    {getEventDescription(event)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatDistanceToNow(new Date(event.receivedAt), { addSuffix: true })}
                  </p>
                </div>
                <StatusBadge status={getEventStatus(event)} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
