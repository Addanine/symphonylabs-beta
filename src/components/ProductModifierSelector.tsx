"use client";

import { useState, useEffect } from "react";
import type { ModifierGroup, ModifierOption } from "~/lib/supabase";
import type { SelectedModifier } from "~/context/CartContext";

interface ProductModifierSelectorProps {
  modifiers: ModifierGroup[];
  basePrice: number;
  onSelectionChange: (selections: SelectedModifier[], totalPrice: number) => void;
}

export default function ProductModifierSelector({
  modifiers,
  basePrice,
  onSelectionChange,
}: ProductModifierSelectorProps) {
  const [selections, setSelections] = useState<Map<string, SelectedModifier>>(new Map());

  // Calculate total price with modifiers
  const calculateTotalPrice = (currentSelections: Map<string, SelectedModifier>) => {
    let total = basePrice;
    currentSelections.forEach(modifier => {
      total += modifier.priceAdjustment;
    });
    return total;
  };

  // Check if an option should be visible based on dependencies
  const isOptionVisible = (option: ModifierOption): boolean => {
    if (!option.dependsOn) return true;
    const dependentSelection = selections.get(option.dependsOn.groupId);
    return dependentSelection?.optionId === option.dependsOn.optionId;
  };

  // Filter visible options for a group
  const getVisibleOptions = (group: ModifierGroup): ModifierOption[] => {
    return group.options.filter(option => isOptionVisible(option));
  };

  // Handle option selection
  const handleSelection = (group: ModifierGroup, option: ModifierOption) => {
    setSelections(prev => {
      const newSelections = new Map(prev);
      newSelections.set(group.id, {
        groupId: group.id,
        groupLabel: group.label,
        optionId: option.id,
        optionLabel: option.label,
        priceAdjustment: option.priceAdjustment,
      });

      // Notify parent of changes
      const selectionsArray = Array.from(newSelections.values());
      onSelectionChange(selectionsArray, calculateTotalPrice(newSelections));

      return newSelections;
    });
  };

  useEffect(() => {
    // Initialize with empty selections
    onSelectionChange([], basePrice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!modifiers?.length) {
    return null;
  }

  return (
    <div className="space-y-6">
      {modifiers.map(group => {
        const visibleOptions = getVisibleOptions(group);

        // Don't render group if no options are visible
        if (visibleOptions.length === 0) return null;

        const selectedOption = selections.get(group.id);

        return (
          <div key={group.id} className="brutalist-border bg-white p-4">
            <div className="mb-3">
              <div className="text-sm font-bold tracking-wide mb-1">
                {group.label}
                {group.required && <span className="text-red-600 ml-1">*</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {visibleOptions.map(option => {
                const isSelected = selectedOption?.optionId === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelection(group, option)}
                    className={`text-left p-3 transition-all ${
                      isSelected
                        ? "brutalist-border bg-black text-white"
                        : "brutalist-border bg-white hover:translate-x-1 hover:translate-y-1"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold tracking-wide">
                        {option.label}
                      </span>
                      {option.priceAdjustment !== 0 && (
                        <span className="text-xs tracking-wide">
                          {option.priceAdjustment > 0 ? '+' : ''}
                          ${option.priceAdjustment.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
