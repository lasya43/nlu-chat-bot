import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DatasetPreviewProps {
  data: any[];
  type: string;
}

const DatasetPreview = ({ data, type }: DatasetPreviewProps) => {
  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No data to preview</div>;
  }

  if (type === "csv") {
    const headers = Object.keys(data[0] || {});
    return (
      <ScrollArea className="h-[400px] w-full rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header) => (
                <TableHead key={header} className="font-semibold">
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={index}>
                {headers.map((header) => (
                  <TableCell key={header}>{row[header]}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    );
  }

  // For JSON and Rasa formats
  return (
    <ScrollArea className="h-[400px] w-full rounded-md border">
      <pre className="p-4 text-sm">
        {JSON.stringify(data, null, 2)}
      </pre>
    </ScrollArea>
  );
};

export default DatasetPreview;