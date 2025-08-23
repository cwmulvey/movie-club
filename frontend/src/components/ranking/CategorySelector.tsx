import React from 'react';
import { HeartIcon, HandThumbDownIcon, HandRaisedIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid, HandThumbDownIcon as HandThumbDownIconSolid, HandRaisedIcon as HandRaisedIconSolid } from '@heroicons/react/24/solid';
import type { Category } from '../../stores/rankingStore';

interface CategorySelectorProps {
  onSelect: (category: Category) => void;
  selectedCategory?: Category;
  disabled?: boolean;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  onSelect,
  selectedCategory,
  disabled = false
}) => {
  const categories = [
    {
      id: 'liked' as Category,
      label: 'I liked it!',
      description: 'Movies you enjoyed watching',
      ratingRange: '6.5 - 10.0',
      icon: HeartIcon,
      iconSolid: HeartIconSolid,
      colorClass: 'text-green-600 bg-green-50 hover:bg-green-100 border-green-200',
      selectedClass: 'bg-green-600 text-white border-green-600'
    },
    {
      id: 'ok' as Category,
      label: 'It was ok',
      description: 'Movies that were decent but not great',
      ratingRange: '3.5 - 6.4',
      icon: HandRaisedIcon,
      iconSolid: HandRaisedIconSolid,
      colorClass: 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100 border-yellow-200',
      selectedClass: 'bg-yellow-600 text-white border-yellow-600'
    },
    {
      id: 'disliked' as Category,
      label: "I didn't like it.",
      description: 'Movies you didn\'t enjoy',
      ratingRange: '0.0 - 3.4',
      icon: HandThumbDownIcon,
      iconSolid: HandThumbDownIconSolid,
      colorClass: 'text-red-600 bg-red-50 hover:bg-red-100 border-red-200',
      selectedClass: 'bg-red-600 text-white border-red-600'
    }
  ];
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        How did you feel about this movie?
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.map((category) => {
          const isSelected = selectedCategory === category.id;
          const Icon = isSelected ? category.iconSolid : category.icon;
          
          return (
            <button
              key={category.id}
              onClick={() => onSelect(category.id)}
              disabled={disabled}
              className={`
                relative p-6 rounded-lg border-2 transition-all duration-200
                ${isSelected 
                  ? category.selectedClass 
                  : category.colorClass
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex flex-col items-center space-y-3">
                <Icon className="w-12 h-12" />
                <div className="text-center">
                  <p className="font-semibold text-lg">
                    {category.label}
                  </p>
                  <p className={`text-sm mt-1 ${isSelected ? 'text-white/80' : 'text-gray-600'}`}>
                    {category.description}
                  </p>
                  <p className={`text-xs mt-2 font-mono ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>
                    Rating: {category.ratingRange}
                  </p>
                </div>
              </div>
              
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="w-3 h-3 bg-white rounded-full" />
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {selectedCategory && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Next step:</strong> We'll compare this movie with others in the "{selectedCategory}" category to find its exact ranking position.
          </p>
        </div>
      )}
    </div>
  );
};

export default CategorySelector;