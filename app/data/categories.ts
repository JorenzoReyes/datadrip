// Category hierarchy data structure
export interface CategoryNode {
  name?: string;
  children?: { [key: string]: CategoryNode };
}

export interface CategoryRoot {
  [key: string]: CategoryNode;
}

// Union type for navigation
type CategoryNavigator = CategoryRoot | CategoryNode;

export const categories: CategoryRoot = {
  "Sports & Outdoors Activities": {
    children: {
      "Watersports Equipment": {
        children: {
          "Swimming": {
            children: {
              "Accessories": {},
              "Training Equipment": {},
              "Floaties": {},
              "Goggles": {},
              "Swim Caps": {}
            }
          },
          "Boarding": {
            children: {
              "Wakeboards": {},
              "Kneeboards": {},
              "Bodyboards": {},
              "Surfboards": {},
              "Water Ski": {},
              "Windsurf": {},
              "Wakeskate": {},
              "Kitesurf": {}
            }
          },
          "Boating": {
            children: {
              "Accessories": {},
              "Racks & Storage": {},
              "Canoes & Kayaks": {},
              "Inflatable Boats": {},
              "Paddles": {}
            }
          },
          "Diving & Snorkeling": {
            children: {
              "Masks": {},
              "Snorkeling Sets": {},
              "Snorkels": {},
              "Fins": {},
              "Accessories": {},
              "Diving Suits": {
                children: {
                  "Wetsuits": {},
                  "Diving Gloves": {},
                  "Diving Hoods": {},
                  "Diving Boots": {}
                }
              },
              "Dive Computers": {},
              "Diving Flashlights": {},
              "Instruments": {
                children: {
                  "Regulators": {},
                  "BCD": {},
                  "Octopus": {},
                  "Gauge": {}
                }
              }
            }
          },
          "Tubing & Towables": {},
          "Accessories": {
            children: {
              "Life Jackets": {},
              "Dry Bags": {}
            }
          }
        }
      },
      "Outdoor Sports & Activities Equipment": {
        children: {
          "Kites & Wind Spinners": {
            children: {
              "Kites": {},
              "Kite Accessories": {},
              "Wind Spinners": {}
            }
          },
          "Camping & Hiking": {
            children: {
              "Folding Knives & Tools": {},
              "Tents": {},
              "Sleeping Gear": {
                children: {
                  "Camping Air Mattresses": {},
                  "Sleeping Bags": {},
                  "Sleeping Pads": {},
                  "Pillows & Accessories": {},
                  "Cots": {},
                  "Hammocks": {}
                }
              },
              "Shelters & Canopies": {},
              "Camp Furniture": {
                children: {
                  "Cots & Hammocks": {},
                  "Camp Tables": {},
                  "Portable Chairs": {},
                  "Storage Trunks": {}
                }
              },
              "Camp Kitchen": {
                children: {
                  "Camping Stoves": {},
                  "Camping Grills": {},
                  "Cookware & Utensils": {},
                  "Coolers": {},
                  "Hydration & Filtration": {}
                }
              },
              "Lighting": {
                children: {
                  "Flashlights": {},
                  "Lanterns": {},
                  "Headlamps": {},
                  "Emergency Light Sticks": {}
                }
              },
              "Navigation & Electronics": {},
              "Trekking Poles": {},
              "Survival Kits": {}
            }
          },
          "Cycling": {
            children: {
              "Cycling Gear": {
                children: {
                  "Cycling Jersey": {},
                  "Cycling Pants": {},
                  "Cycling Sleeves": {},
                  "Cycling Gloves": {},
                  "Bike Helmets": {}
                }
              },
              "Bikes": {
                children: {
                  "Unicycles & Tandem Bikes": {},
                  "Mountain Bikes": {},
                  "BMX": {},
                  "Comfort & Cruiser Bikes": {},
                  "Folding Bikes": {},
                  "Hybrid Bikes": {},
                  "Road Bikes": {},
                  "Kids Bikes": {},
                  "Fixed Gear Bikes": {},
                  "Electric Bicycles": {}
                }
              },
              "Bike Accessories": {
                children: {
                  "Other Bike Accessories": {},
                  "Racks & Storage": {},
                  "Child Seats": {},
                  "Lights & Reflectors": {},
                  "Locks": {},
                  "Mount Holders": {},
                  "Covers & Cases": {},
                  "Cycling Bags": {},
                  "Cycling Performance Tracker": {}
                }
              },
              "Bikes Parts": {
                children: {
                  "Tires and Wheels": {},
                  "Bike Parts & Spares": {},
                  "Saddles & Saddles Covers": {},
                  "Frames": {},
                  "Handlebars": {},
                  "Pedals": {},
                  "Baskets": {},
                  "Bells & Horns": {},
                  "Mirrors": {}
                }
              }
            }
          },
          "Skateboards": {
            children: {
              "Kids Skateboards": {},
              "Skateboard Parts": {},
              "Skateboards": {},
              "Ramps & Rails": {}
            }
          },
          "Climbing": {
            children: {
              "Other Climbing Equipment, Protection Tools, & Accessories": {},
              "Carabiners & Quickdraws": {},
              "Harnesses": {},
              "Ropes, Cords & Slings": {},
              "Belay Devices": {},
              "Chalk & Bags": {},
              "Climbing Gloves": {},
              "Crash Pads": {},
              "Climbing Holds": {}
            }
          },
          "Scooters": {
            children: {
              "Kids Scooters": {},
              "Electric Scooters": {},
              "Kick Scooters": {},
              "Self Balancing Scooters": {},
              "Electric Unicycles": {}
            }
          },
          "Inline & Roller Skates": {
            children: {
              "Roller Blades": {},
              "Kids Skates": {},
              "Roller Skates": {},
              "Skates Parts": {},
              "Ice Skates": {},
              "Helmets": {},
              "Protective Pads": {}
            }
          },
          "Fishing": {
            children: {
              "Accessories": {},
              "Fishing Rods": {},
              "Fishing Reels": {},
              "Fishing Rod & Reel Sets": {},
              "Fishing Lines": {},
              "Lures & Baits": {},
              "Fishing Tackles": {},
              "GPS & Fishfinders": {},
              "Fishing Nets": {}
            }
          },
          "Shooting": {
            children: {
              "Shooting Protective Gear": {},
              "Shooting Accessories & Equipment": {},
              "Optics": {},
              "Archery": {}
            }
          }
        }
      }
    }
  }
};

// Helper functions to get category options
export function getCategoryOptions(level: number, selectedPath: string[] = []): string[] {
  let current: CategoryNavigator = categories;
  
  // For level 1, return the root categories
  if (level === 1) {
    const rootKeys = Object.keys(current);
    return rootKeys;
  }
  
  // Navigate to the parent of the current level
  // For level 2, we need to navigate to the selected category from level 1
  // For level 3, we need to navigate to the selected category from level 2, etc.
  for (let i = 0; i < level - 1 && i < selectedPath.length; i++) {
    // First check if the selectedPath[i] exists as a direct property
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((current as any)[selectedPath[i]]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      current = (current as any)[selectedPath[i]];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } else if (current.children && (current.children as any)[selectedPath[i]]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      current = (current.children as any)[selectedPath[i]];
    } else {
      return [];
    }
  }
  
  // Return children names of the current level
  if (current.children) {
    const childKeys = Object.keys(current.children);
    return childKeys;
  }
  
  return [];
}

export function getCategoryPath(selectedPath: string[]): string {
  return selectedPath.join(' > ');
}

// Helper function to check if a category path has more children available
export function hasMoreChildren(selectedPath: string[]): boolean {
  let current: CategoryNavigator = categories;
  
  // Navigate to the current position using the same logic as getCategoryOptions
  for (let i = 0; i < selectedPath.length; i++) {
    const category = selectedPath[i];
    
    // Check as direct property (for root level)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((current as any)[category]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      current = (current as any)[category];
    } 
    // Check in children (for sub-levels)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    else if (current.children && (current.children as any)[category]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      current = (current.children as any)[category];
    } else {
      return false; // Path doesn't exist
    }
  }
  
  // Check if current position has children
  return !!(current.children && Object.keys(current.children).length > 0);
}
