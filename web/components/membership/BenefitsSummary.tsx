"use client";

interface Benefits {
  openStudio: {
    maxBlockMinutes: number;
    maxBookingsPerWeek: number;
    premiumTimeAccess: boolean;
    advanceBookingDays: number;
    walkInAllowed: boolean;
  };
  resources: {
    specialTools: boolean;
    specialGlazes: boolean;
  };
  firings: {
    includedPerPeriod: number;
    unlimited: boolean;
  };
  discounts: {
    classDiscountPercent: number;
    retailDiscountPercent: number;
  };
}

interface Props {
  benefits: Benefits;
}

export default function BenefitsSummary({ benefits }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-500 uppercase">Open Studio</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Session length</span>
            <span className="font-medium">Up to {benefits.openStudio.maxBlockMinutes} min</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Bookings per week</span>
            <span className="font-medium">{benefits.openStudio.maxBookingsPerWeek}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Advance booking</span>
            <span className="font-medium">{benefits.openStudio.advanceBookingDays} day(s)</span>
          </div>
          {benefits.openStudio.premiumTimeAccess && (
            <div className="text-sm text-green-600 font-medium">Premium time access</div>
          )}
          {benefits.openStudio.walkInAllowed && (
            <div className="text-sm text-green-600 font-medium">Walk-in allowed</div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-500 uppercase">Perks</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Kiln firings</span>
            <span className="font-medium">
              {benefits.firings.unlimited ? "Unlimited" : `${benefits.firings.includedPerPeriod}/period`}
            </span>
          </div>
          {benefits.resources.specialTools && (
            <div className="text-sm text-green-600 font-medium">Special tools</div>
          )}
          {benefits.resources.specialGlazes && (
            <div className="text-sm text-green-600 font-medium">Special glazes</div>
          )}
          {benefits.discounts.classDiscountPercent > 0 && (
            <div className="text-sm text-green-600 font-medium">
              {benefits.discounts.classDiscountPercent}% off classes
            </div>
          )}
          {benefits.discounts.retailDiscountPercent > 0 && (
            <div className="text-sm text-green-600 font-medium">
              {benefits.discounts.retailDiscountPercent}% retail discount
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
