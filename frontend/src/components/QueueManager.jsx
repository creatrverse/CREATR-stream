import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Music, Check, X, Link2, Trash2, Users } from "lucide-react";

export const QueueManager = ({
  submissions,
  skipQueue,
  queueStats,
  usernameMappings,
  mappingForm,
  setMappingForm,
  markSubmission,
  markSkipSubmission,
  addUsernameMapping,
  removeUsernameMapping
}) => {
  return (
    <div className="space-y-6">
      {/* Queue Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-400">{queueStats.pending}</p>
              <p className="text-xs text-gray-400 mt-1">Pending</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-400">{queueStats.played}</p>
              <p className="text-xs text-gray-400 mt-1">Played</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-400">{queueStats.skipped}</p>
              <p className="text-xs text-gray-400 mt-1">Skipped</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-400">{queueStats.skip_queue_count}</p>
              <p className="text-xs text-gray-400 mt-1">Skip Queue</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-cyan-400">{queueStats.total_submissions}</p>
              <p className="text-xs text-gray-400 mt-1">Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Queue */}
        <Card className="glass lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="w-5 h-5 text-pink-400" />
              Submission Queue ({submissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-3">
                {submissions.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No submissions yet</p>
                  </div>
                ) : (
                  submissions.map((sub, index) => (
                    <Card key={sub.id} className="glass border-pink-400/30">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="bg-purple-500">{index + 1}</Badge>
                              <p className="font-bold text-white">{sub.discord_display_name}</p>
                              {sub.twitch_username && (
                                <Badge variant="outline" className="text-cyan-400 border-cyan-400">
                                  <Users className="w-3 h-3 mr-1" />
                                  {sub.twitch_username}
                                </Badge>
                              )}
                            </div>
                            
                            <a 
                              href={sub.song_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-pink-400 hover:text-pink-300 flex items-center gap-1 mb-2 break-all"
                            >
                              <Link2 className="w-3 h-3 flex-shrink-0" />
                              {sub.song_link}
                            </a>
                            
                            <p className="text-xs text-gray-400 line-clamp-2">{sub.message_content}</p>
                            <p className="text-[10px] text-gray-500 mt-1">
                              Submitted: {new Date(sub.submitted_at).toLocaleString()}
                            </p>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-500 hover:bg-green-600"
                              onClick={() => markSubmission(sub.id, 'played')}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => markSubmission(sub.id, 'skipped')}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Skip Queue */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="w-5 h-5 text-yellow-400" />
                Skip Queue ({skipQueue.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[250px] pr-2">
                <div className="space-y-2">
                  {skipQueue.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-8">No skips</p>
                  ) : (
                    skipQueue.map((sub) => (
                      <Card key={sub.id} className="glass border-yellow-400/30">
                        <CardContent className="p-3">
                          <p className="font-bold text-sm text-white mb-1">{sub.discord_display_name}</p>
                          {sub.twitch_username && (
                            <Badge variant="outline" className="text-cyan-400 border-cyan-400 text-xs mb-2">
                              {sub.twitch_username}
                            </Badge>
                          )}
                          <a 
                            href={sub.song_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1 mb-2 break-all"
                          >
                            <Link2 className="w-3 h-3 flex-shrink-0" />
                            {sub.song_link.substring(0, 40)}...
                          </a>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-500 hover:bg-green-600 text-xs h-7"
                              onClick={() => markSkipSubmission(sub.id, 'played')}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-xs h-7"
                              onClick={() => markSkipSubmission(sub.id, 'skipped')}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Username Mapping */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Link2 className="w-4 h-4 text-cyan-400" />
                Username Mapping
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Discord Username</Label>
                  <Input
                    value={mappingForm.discord_username}
                    onChange={(e) => setMappingForm({...mappingForm, discord_username: e.target.value})}
                    placeholder="Discord name"
                    className="bg-black/40 border-cyan-400/30 text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">Twitch Username</Label>
                  <Input
                    value={mappingForm.twitch_username}
                    onChange={(e) => setMappingForm({...mappingForm, twitch_username: e.target.value})}
                    placeholder="Twitch name"
                    className="bg-black/40 border-cyan-400/30 text-sm"
                  />
                </div>
                
                <Button
                  onClick={addUsernameMapping}
                  className="w-full bg-cyan-500 hover:bg-cyan-600"
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  Add Mapping
                </Button>

                <ScrollArea className="h-[150px] mt-4">
                  <div className="space-y-2">
                    {Object.entries(usernameMappings).length === 0 ? (
                      <p className="text-center text-gray-400 text-xs py-4">No mappings yet</p>
                    ) : (
                      Object.entries(usernameMappings).map(([discord, twitch]) => (
                        <div key={discord} className="flex items-center justify-between p-2 glass rounded">
                          <div className="text-xs">
                            <p className="text-white font-semibold">{discord}</p>
                            <p className="text-cyan-400">→ {twitch}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-6 w-6 p-0"
                            onClick={() => removeUsernameMapping(discord)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
