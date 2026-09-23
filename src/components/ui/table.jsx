import * as React from "react";

export function Table({ children, ...props }) {
  return <table className="w-full border-collapse text-sm" {...props}>{children}</table>;
}

export function TableHeader({ children }) {
  return <thead className="bg-gray-100 text-gray-700">{children}</thead>;
}

export function TableBody({ children }) {
  return <tbody className="divide-y">{children}</tbody>;
}

export function TableRow({ children }) {
  return <tr className="hover:bg-gray-50">{children}</tr>;
}

export function TableHead({ children }) {
  return (
    <th className="px-4 py-2 text-left font-medium text-gray-600 border-b">
      {children}
    </th>
  );
}

export function TableCell({ children }) {
  return <td className="px-4 py-2 border-b">{children}</td>;
}
