'use client';

import parse, { domToReact, Element } from 'html-react-parser';
import AdminNavIcon from './Admin/AdminNavIcon';

type HeaderBlockProps = {
  html: string;
};

export default function HeaderBlock({ html }: HeaderBlockProps) {
  if (!html) return null;

  const options = {
    replace: (domNode: any) => {
      // Look for the Foundation Nav Item
      // Inspecting the specific structure might require some trial/error or exact class names.
      // Based on typical Elementor/HTML structure, we look for text content "THE FOUNDATION"
      // or a specific link.
      
      if (domNode.type === 'tag' && domNode.name === 'a') {
         // check if text content includes "THE FOUNDATION"
         // domNode.children is an array of nodes.
         const hasFoundation = domNode.children?.some(
            (child: any) => child.type === 'text' && child.data?.includes('FOUNDATION')
         );

         if (hasFoundation) {
             // We return the original link, BUT followed by our Admin Icon.
             // Since we need to return a single React element, we wrap in React.Fragment or just inject.
             // However, replace() expects a valid return.
             // We can't return an arrow function that returns multiple nodes easily in valid DOM structure if the parent is a <ul> or something.
             // Ideally we find the *List Item* (li) containing it.
         }
      }

      // If we find the 'THE FOUNDATION' text node directly?
      if (domNode.type === 'text' && domNode.data.includes('THE FOUNDATION')) {
          // This is too deep.
      }
      
      // Better Query: Look for the container of the menu items if possible, and append.
      // Or just find the "THE FOUNDATION" link and append the icon *after* it.
      // If the link is in a flex container, it might just appear next to it.
      
      // Let's try to match the specific "Foundation" text and return the node + Icon.
      // But `replace` replaces the node. So we need to reconstruct the node.
      
      // Strategy 2: If we match the <a> tag containing FOUNDATION:
      if (domNode.type === 'tag' && domNode.name === 'div' && domNode.attribs?.class?.includes('elementor-widget-container')) {
           // This might be too broad.
      }
    },
  };
  
  // SIMPLER STRATEGY: 
  // Just use regex to inject the placeholder for the React component? 
  // No, we need it to be interactive (React).
  
  // Let's use `html-react-parser` but we need to find the right spot.
  // The user said "immediately after the Foundation icon".
  // Assuming "The Foundation" is a menu item.
  
  const transform = (node: any) => {
    // Check if node is an element
    if (node.type === 'tag' && node.name === 'a') {
        let isFoundation = false;
        if (node.children) {
            node.children.forEach((child: any) => {
               if (child.type === 'text' && (child.data.includes('THE FOUNDATION') || child.data.includes('The Foundation'))) {
                   isFoundation = true;
               }
            });
        }
        
        if (isFoundation) {
            return (
                <div className="inline-flex items-center gap-2">
                    {domToReact([node])}
                    <AdminNavIcon />
                </div>
            );
        }
    }
  };

  return <div suppressHydrationWarning>{parse(html, { replace: transform })}</div>;
}
