import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Plus, X, Trash2, Settings, Eye, Move, Save, FileText } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Widget type definitions
export interface Widget {
  id: string;
  type: string;
  title: string;
  settings: {
    dataSource?: string;
    refreshInterval?: number;
    color?: string;
    size?: 'small' | 'medium' | 'large';
    chartType?: 'bar' | 'line' | 'pie' | 'card';
    displayMode?: 'value' | 'chart' | 'table';
    [key: string]: any;
  };
  position: number;
}

interface WidgetBuilderProps {
  widgets: Widget[];
  onSave: (widgets: Widget[]) => void;
  availableDataSources: {
    id: string;
    name: string;
    type: string;
  }[];
}

export const WidgetBuilder: React.FC<WidgetBuilderProps> = ({ 
  widgets, 
  onSave, 
  availableDataSources 
}) => {
  const [items, setItems] = useState<Widget[]>(widgets);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Define widget templates
  const widgetTemplates = [
    { 
      type: 'statCard', 
      title: 'Statistic Card', 
      settings: { 
        dataSource: '', 
        displayMode: 'value',
        size: 'small',
        color: '#4C51BF',
      } 
    },
    { 
      type: 'chart', 
      title: 'Chart', 
      settings: { 
        dataSource: '', 
        chartType: 'bar',
        size: 'medium',
      } 
    },
    { 
      type: 'table', 
      title: 'Data Table', 
      settings: { 
        dataSource: '', 
        size: 'large',
      } 
    },
  ];

  // Handle drag and drop
  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const reorderedItems = Array.from(items);
    const [movedItem] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, movedItem);
    
    // Update positions
    const updatedItems = reorderedItems.map((item, index) => ({
      ...item,
      position: index
    }));
    
    setItems(updatedItems);
  };

  // Add a new widget
  const addWidget = (templateType: string) => {
    const template = widgetTemplates.find(t => t.type === templateType);
    if (!template) return;
    
    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type: template.type,
      title: template.title,
      settings: { ...template.settings },
      position: items.length
    };
    
    setItems([...items, newWidget]);
    setEditingWidget(newWidget);
    
    toast({
      title: 'Widget Added',
      description: `${template.title} has been added to your dashboard`,
    });
  };

  // Delete a widget
  const deleteWidget = (id: string) => {
    const updatedWidgets = items
      .filter(widget => widget.id !== id)
      .map((widget, index) => ({
        ...widget,
        position: index
      }));
    
    setItems(updatedWidgets);
    
    toast({
      title: 'Widget Removed',
      description: 'The widget has been removed from your dashboard'
    });
  };

  // Save widget settings
  const saveWidgetSettings = (widget: Widget) => {
    const updatedWidgets = items.map(item => 
      item.id === widget.id ? widget : item
    );
    
    setItems(updatedWidgets);
    setEditingWidget(null);
    
    toast({
      title: 'Widget Updated',
      description: 'Widget settings have been saved'
    });
  };

  // Save dashboard configuration
  const saveDashboard = async () => {
    try {
      await onSave(items);
      
      toast({
        title: 'Dashboard Saved',
        description: 'Your dashboard configuration has been saved'
      });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'There was a problem saving your dashboard',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Widget Builder</h2>
          <p className="text-muted-foreground">Customize your dashboard by adding and arranging widgets</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? (
              <>
                <Settings className="mr-2 h-4 w-4" />
                Edit Mode
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </>
            )}
          </Button>
          <Button onClick={saveDashboard}>
            <Save className="mr-2 h-4 w-4" />
            Save Dashboard
          </Button>
        </div>
      </div>
      
      {!previewMode && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {widgetTemplates.map((template) => (
            <Card key={template.type} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{template.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {template.type === 'statCard' && 'Display a single statistic or KPI'}
                {template.type === 'chart' && 'Visualize data with various chart types'}
                {template.type === 'table' && 'Show data in a tabular format'}
              </CardContent>
              <CardFooter>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full"
                  onClick={() => addWidget(template.type)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add to Dashboard
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="dashboard-widgets">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`grid gap-4 ${
                previewMode 
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                  : 'grid-cols-1'
              }`}
            >
              {items.length === 0 ? (
                <div className="col-span-full bg-muted/30 rounded-lg p-8 text-center">
                  <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                  <h3 className="text-lg font-medium mb-1">No Widgets Added</h3>
                  <p className="text-muted-foreground mb-4">Start by adding widgets from the templates above</p>
                  <Button onClick={() => addWidget('statCard')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Widget
                  </Button>
                </div>
              ) : (
                items
                  .sort((a, b) => a.position - b.position)
                  .map((widget, index) => (
                    <Draggable 
                      key={widget.id} 
                      draggableId={widget.id} 
                      index={index}
                      isDragDisabled={previewMode}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`${
                            previewMode && widget.settings.size === 'large' 
                              ? 'md:col-span-2 lg:col-span-3' 
                              : previewMode && widget.settings.size === 'medium'
                              ? 'lg:col-span-2'
                              : ''
                          }`}
                        >
                          <Card className="shadow-sm hover:shadow transition-shadow">
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg truncate" style={{ 
                                  color: widget.settings.color || 'inherit'
                                }}>
                                  {widget.title}
                                </CardTitle>
                                <div className="flex items-center gap-1">
                                  {!previewMode && (
                                    <>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8"
                                        {...provided.dragHandleProps}
                                      >
                                        <Move className="h-4 w-4" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8"
                                        onClick={() => setEditingWidget(widget)}
                                      >
                                        <Settings className="h-4 w-4" />
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-destructive"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Widget</AlertDialogTitle>
                                          </AlertDialogHeader>
                                          <p>Are you sure you want to remove this widget from your dashboard?</p>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction 
                                              onClick={() => deleteWidget(widget.id)}
                                              className="bg-destructive text-destructive-foreground"
                                            >
                                              Delete
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <WidgetPreview widget={widget} />
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </Draggable>
                  ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      
      {editingWidget && (
        <WidgetEditor 
          widget={editingWidget} 
          dataSources={availableDataSources}
          onSave={saveWidgetSettings}
          onCancel={() => setEditingWidget(null)}
        />
      )}
    </div>
  );
};

// Widget Editor Modal Component
interface WidgetEditorProps {
  widget: Widget;
  dataSources: { id: string; name: string; type: string }[];
  onSave: (widget: Widget) => void;
  onCancel: () => void;
}

const WidgetEditor: React.FC<WidgetEditorProps> = ({ 
  widget, 
  dataSources, 
  onSave, 
  onCancel 
}) => {
  const [editedWidget, setEditedWidget] = useState<Widget>({ ...widget });
  
  const updateSetting = (key: string, value: any) => {
    setEditedWidget({
      ...editedWidget,
      settings: {
        ...editedWidget.settings,
        [key]: value
      }
    });
  };
  
  const handleSave = () => {
    onSave(editedWidget);
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Edit Widget</h3>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <Label htmlFor="widget-title">Widget Title</Label>
            <Input 
              id="widget-title" 
              value={editedWidget.title} 
              onChange={(e) => setEditedWidget({ ...editedWidget, title: e.target.value })}
            />
          </div>
          
          <Tabs defaultValue="data" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="data">Data Source</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>
            
            <TabsContent value="data" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="data-source">Data Source</Label>
                <Select 
                  value={editedWidget.settings.dataSource} 
                  onValueChange={(value) => updateSetting('dataSource', value)}
                >
                  <SelectTrigger id="data-source">
                    <SelectValue placeholder="Select data source" />
                  </SelectTrigger>
                  <SelectContent>
                    {dataSources.map((source) => (
                      <SelectItem key={source.id} value={source.id}>
                        {source.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {editedWidget.type === 'chart' && (
                <div className="space-y-2">
                  <Label htmlFor="chart-type">Chart Type</Label>
                  <Select 
                    value={editedWidget.settings.chartType} 
                    onValueChange={(value) => updateSetting('chartType', value)}
                  >
                    <SelectTrigger id="chart-type">
                      <SelectValue placeholder="Select chart type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">Bar Chart</SelectItem>
                      <SelectItem value="line">Line Chart</SelectItem>
                      <SelectItem value="pie">Pie Chart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {editedWidget.type === 'statCard' && (
                <div className="space-y-2">
                  <Label htmlFor="display-mode">Display Mode</Label>
                  <Select 
                    value={editedWidget.settings.displayMode} 
                    onValueChange={(value) => updateSetting('displayMode', value)}
                  >
                    <SelectTrigger id="display-mode">
                      <SelectValue placeholder="Select display mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="value">Single Value</SelectItem>
                      <SelectItem value="chart">Mini Chart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="refresh-interval">Refresh Interval (seconds)</Label>
                <Input 
                  id="refresh-interval" 
                  type="number" 
                  min="0"
                  value={editedWidget.settings.refreshInterval || 0} 
                  onChange={(e) => updateSetting('refreshInterval', parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Set to 0 to disable automatic refresh
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="appearance" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="widget-size">Widget Size</Label>
                <Select 
                  value={editedWidget.settings.size} 
                  onValueChange={(value) => updateSetting('size', value)}
                >
                  <SelectTrigger id="widget-size">
                    <SelectValue placeholder="Select widget size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small (1x1)</SelectItem>
                    <SelectItem value="medium">Medium (2x1)</SelectItem>
                    <SelectItem value="large">Large (3x1 or Full Width)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="widget-color">Accent Color</Label>
                <div className="flex gap-2">
                  <Input 
                    id="widget-color" 
                    type="color" 
                    value={editedWidget.settings.color || '#4C51BF'} 
                    onChange={(e) => updateSetting('color', e.target.value)}
                    className="w-12 h-10 p-1"
                  />
                  <Input 
                    value={editedWidget.settings.color || '#4C51BF'} 
                    onChange={(e) => updateSetting('color', e.target.value)}
                    placeholder="#4C51BF"
                    className="flex-1"
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="advanced" className="space-y-4 pt-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="show-legend"
                  checked={editedWidget.settings.showLegend || false}
                  onCheckedChange={(checked) => updateSetting('showLegend', checked)}
                />
                <Label htmlFor="show-legend">Show Legend</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="show-grid"
                  checked={editedWidget.settings.showGrid || false}
                  onCheckedChange={(checked) => updateSetting('showGrid', checked)}
                />
                <Label htmlFor="show-grid">Show Grid Lines</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="animate"
                  checked={editedWidget.settings.animate || true}
                  onCheckedChange={(checked) => updateSetting('animate', checked)}
                />
                <Label htmlFor="animate">Enable Animations</Label>
              </div>
              
              {(editedWidget.type === 'chart' || editedWidget.type === 'table') && (
                <div className="space-y-2">
                  <Label htmlFor="max-items">Maximum Items to Display</Label>
                  <Input 
                    id="max-items" 
                    type="number" 
                    min="1"
                    value={editedWidget.settings.maxItems || 10} 
                    onChange={(e) => updateSetting('maxItems', parseInt(e.target.value))}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
};

// Widget Preview Component
const WidgetPreview: React.FC<{ widget: Widget }> = ({ widget }) => {
  // This is a placeholder that would be replaced with actual data visualization
  // based on the widget type and settings
  
  const getRandomValue = () => Math.floor(Math.random() * 100);
  
  if (widget.type === 'statCard') {
    return (
      <div className="flex items-center justify-between">
        <div>
          <p className="text-4xl font-bold" style={{ color: widget.settings.color }}>
            {getRandomValue()}
          </p>
          <p className="text-sm text-muted-foreground">Example statistic</p>
        </div>
        {widget.settings.displayMode === 'chart' && (
          <div className="w-24 h-16 bg-muted rounded-md flex items-end justify-between px-1">
            {[...Array(7)].map((_, i) => (
              <div 
                key={i}
                className="w-2 rounded-t-sm" 
                style={{ 
                  height: `${Math.max(15, Math.random() * 100)}%`,
                  backgroundColor: widget.settings.color || '#4C51BF',
                  opacity: 0.7
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
  
  if (widget.type === 'chart') {
    // Simplified chart preview
    if (widget.settings.chartType === 'pie') {
      return (
        <div className="flex justify-center">
          <div className="w-32 h-32 rounded-full border-8 relative" style={{ 
            borderColor: widget.settings.color || '#4C51BF',
            background: `conic-gradient(
              ${widget.settings.color || '#4C51BF'} 0% 60%, 
              #E5E7EB 60% 100%
            )`
          }}>
            <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">
              60%
            </div>
          </div>
        </div>
      );
    }
    
    // Bar or line chart preview
    return (
      <div className="h-40 flex items-end justify-between bg-muted/30 rounded-md px-2 pt-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div 
              className="w-6 rounded-t-sm" 
              style={{ 
                height: `${Math.max(10, Math.random() * 80)}%`,
                backgroundColor: widget.settings.color || '#4C51BF',
              }}
            />
            <span className="text-[10px] text-muted-foreground">
              {String.fromCharCode(65 + i)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  
  if (widget.type === 'table') {
    return (
      <div className="border rounded-md overflow-hidden">
        <div className="grid grid-cols-3 text-xs font-medium bg-muted p-2">
          <div>Item</div>
          <div>Category</div>
          <div className="text-right">Value</div>
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="grid grid-cols-3 text-xs p-2 border-t">
            <div>Item {i + 1}</div>
            <div>Category {String.fromCharCode(65 + i)}</div>
            <div className="text-right">{getRandomValue()}</div>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="p-6 text-center text-muted-foreground">
      Widget Preview
    </div>
  );
};

export default WidgetBuilder;